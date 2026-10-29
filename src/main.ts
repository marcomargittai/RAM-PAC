import { Sfx, type Bed } from './audio'
import { createCrt, curve, type Crt } from './crt'
import { Finale } from './finale'
import { cleanName, loadBoard, safeName, saveRecord, thisWeek, type Entry } from './leaderboard'
import { fetchWeekly, online, startRun as startOnlineRun, submit } from './online'
import { LEVELS } from './levels'
import { drawBriefing, drawEntry, drawLeaderboard, drawStory } from './scenes'
import { BOOT_SECONDS, DEV, drawBackdrop, drawScreen, layoutFor, snapshot, type Card, type Hit, type HitId, type View } from './screen'
import { createGame, startRun, update, visual, type Dir, type Game } from './sim'
import { countVisit, gatherIntel, type Intel } from './intel'
import { Takeover } from './takeover'
import { LOSE_LINE, SCENES, StoryPlayer, VOICES, type SceneId } from './story'
import { theme } from './palette'
import { tileSize } from './render'
import { drawFacing, pacFrame, setPacForm } from './sprites'
import { Upgrade } from './upgrade'
import { CHAT_VOICES } from './chat'
import { CREDIT_URL, drawTitle } from './title'
import { readChallenge, shareRun } from './share'
import './style.css'

type Stage =
  | { kind: 'game' }
  | { kind: 'story'; id: SceneId; player: StoryPlayer; then: (answer: number) => void }
  | { kind: 'finale'; finale: Finale }
  | { kind: 'entry'; escaped: boolean; level: number }
  | { kind: 'board'; mine: Entry | null; from: 'title' | 'run' }
  | { kind: 'briefing' }
  | { kind: 'takeover'; tk: Takeover }
  | { kind: 'upgrade'; up: Upgrade; then: () => void }

const game: Game = createGame()
const audio = new Sfx()
const source = document.querySelector<HTMLCanvasElement>('#screen')!
const ctx = source.getContext('2d')!
let crt: Crt | null = createCrt()
let canvas = crt ? crt.canvas : source
if (crt) {
  crt.canvas.setAttribute('aria-hidden', 'true')
  source.replaceWith(crt.canvas)
  crt.canvas.addEventListener('webglcontextlost', () => {
    crt?.canvas.replaceWith(source)
    crt = null
    canvas = source
    listen(canvas)
  })
}
const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
const status = document.querySelector<HTMLElement>('#status')!
const action = document.querySelector<HTMLButtonElement>('#ov-action')!
const muteBtn = document.querySelector<HTMLButtonElement>('#mute')!
const pauseBtn = document.querySelector<HTMLButtonElement>('#pause')!
const nameInput = document.querySelector<HTMLInputElement>('#name-input')!

const held = new Set<Dir>()
const lit = new Set<HitId>()
const padPointers = new Map<number, Dir>()
let lastDir: Dir | null = null
let startEdge = false
let pauseEdge = false
let card: Card | null = null
let cardSig = ''
let hits: Hit[] = []
let hover: HitId | null = null
let pressed: { id: HitId; pointer: number } | null = null
let loadedAt = performance.now()
let booted = calm.matches
let bootEndedAt = booted ? loadedAt : 0
let stage: Stage = { kind: 'game' }
let records: Entry[] = thisWeek(loadBoard())
// whether the records on screen are the global board or only this device's
let recordsGlobal = false
let boardLoading = false

// This week's board: the local one at once, then the global one if it answers.
function refreshBoard(): void {
  records = thisWeek(loadBoard())
  recordsGlobal = false
  if (!online) return
  boardLoading = true
  void fetchWeekly().then((list) => {
    boardLoading = false
    if (list) {
      records = list
      recordsGlobal = true
    }
  })
}

// The server's ticket for the run in progress; a score is sent only with one.
let runTicket: Promise<string | null> = Promise.resolve(null)

function ticketRun(): void {
  runTicket = online ? startOnlineRun() : Promise.resolve(null)
}

// The last saved run and its weekly rank, for sharing.
let lastRun: { entry: Entry; rank: number | null } | null = null
const challenge = readChallenge()

function keep(entry: Entry): number {
  const rank = saveRecord(entry)
  records = thisWeek(loadBoard())
  const ticket = runTicket
  runTicket = Promise.resolve(null)
  const run = { entry, rank: null as number | null }
  lastRun = run
  void ticket
    .then((id) => (id ? submit(entry, id) : null))
    .then((place) => {
      run.rank = place
      refreshBoard()
    })
  return rank
}

function share(): void {
  if (!lastRun) return
  void shareRun(lastRun.entry, lastRun.rank).then((how) => {
    if (how === 'saved') showToast('Score card saved and link copied. Post it, tag a friend.', 5)
  })
}

function leaveBoard(): void {
  if (stage.kind !== 'board') return
  if (stage.from === 'title') stage = { kind: 'game' }
  else runAgain()
}

function openBoard(): void {
  audio.unlock()
  stage = { kind: 'board', mine: null, from: 'title' }
  refreshBoard()
}
let seenPrologue = false
let told = new Set<number>()
// PAC-7's current form: 0 at the start of a run, one more after each rewrite.
let grown = 0
let choice = 0
let glitchPulse = 0
let flat = 0
let power = 1
let entryName = ''
let nameFocused = false
let lastMode = game.mode
let intel: Intel | null = null
let runStartedAt = performance.now()
let fullscreenTried = false

const KEY_DIRS: Record<string, Dir> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
  a: 'left',
  d: 'right',
  w: 'up',
  s: 'down',
  A: 'left',
  D: 'right',
  W: 'up',
  S: 'down',
}

const PAD: Partial<Record<HitId, Dir>> = { up: 'up', down: 'down', left: 'left', right: 'right' }

function celebrating(): boolean {
  return game.mode === 'cleared' && game.modeTimer > 0
}

function endBoot(): void {
  if (booted) return
  booted = true
  bootEndedAt = performance.now()
}

function tell(id: SceneId, then: (answer: number) => void): void {
  audio.unlock()
  choice = 0
  stage = {
    kind: 'story',
    id,
    then,
    player: new StoryPlayer(SCENES[id], {
      say: (voice) => audio.say(voice),
      type: () => audio.play('type', 0.18, 0.9 + Math.random() * 0.25),
      alert: () => {
        audio.play('glitch', 0.8)
        glitchPulse = 1
      },
    }),
  }
}

function upgradeTo(to: number, then: () => void): void {
  audio.unlock()
  stage = {
    kind: 'upgrade',
    then,
    up: new Upgrade(grown, to, {
      say: (voice) => audio.say(voice),
      build: () => audio.play('upgrade', 0.75),
      glitch: () => {
        audio.play('glitch', 0.6)
        glitchPulse = 0.6
      },
      done: () => {
        audio.play('online', 0.85)
        navigator.vibrate?.([30, 30, 60])
      },
    }),
  }
}

function finishUpgrade(): void {
  if (stage.kind !== 'upgrade') return
  grown = stage.up.to
  stage.then()
}

function play(): void {
  stage = { kind: 'game' }
}

function beginRun(): void {
  runStartedAt = performance.now()
  ticketRun()
  if (!seenPrologue) {
    seenPrologue = true
    audio.play('boot', 0.7)
    tell('prologue', () => {
      stage = { kind: 'briefing' }
    })
    return
  }
  play()
  startEdge = true
}

function startFinale(): void {
  const view = currentView()
  const scale = 1.5
  const snap = snapshot(game, view, scale)
  const pos = visual(game.player)
  const b = snap.lay.board
  const start = { x: b.x + pos.x * tileSize() + tileSize() / 2, y: b.y + pos.y * tileSize() + tileSize() / 2 }
  document.title = 'pac ram is eating'
  stage = {
    kind: 'finale',
    finale: new Finale(snap.canvas, snap.lay, scale, start, {
      chomp: () => {
        audio.chomp()
        navigator.vibrate?.(8)
      },
      say: (voice) => audio.say(voice),
      shatter: () => {
        audio.play('shatter', 1)
        navigator.vibrate?.([60, 40, 120])
      },
      glitch: () => audio.play('glitch', 0.9),
      rumble: () => {
        audio.play('rumble', 0.9)
        navigator.vibrate?.([40, 60, 40, 60, 120])
      },
    }),
  }
}

const TAKEOVER_TITLES = ['pac ram is in your cpu', 'pac ram is in your gpu', 'pac ram ate your firewall', 'pac ram is in your browser', 'pac ram is everywhere']
let favicon: HTMLLinkElement | null = null

// PAC-7 leaves the game: the tab title, the tab icon and the address bar.
function infestPage(): void {
  try {
    history.replaceState(null, '', `${location.pathname}${location.search}#pac-7-was-here`)
  } catch {
    // some embeds refuse; the rest still happens
  }
  const art = pacFrame(1)
  if (art && !favicon) {
    const c = document.createElement('canvas')
    c.width = 64
    c.height = 64
    const fx = c.getContext('2d')!
    fx.imageSmoothingEnabled = false
    fx.fillStyle = '#ff2d6f'
    fx.beginPath()
    fx.arc(32, 32, 31, 0, Math.PI * 2)
    fx.fill()
    drawFacing(fx, art, 32, 32, 52, 'right', 'right')
    favicon = document.createElement('link')
    favicon.rel = 'icon'
    favicon.href = c.toDataURL('image/png')
    document.head.appendChild(favicon)
  }
}

function cleanPage(): void {
  document.title = 'PAC RAM: ROGUE AI'
  favicon?.remove()
  favicon = null
  canvas.style.cursor = 'default'
  if (location.hash) {
    try {
      history.replaceState(null, '', `${location.pathname}${location.search}`)
    } catch {
      // ignore
    }
  }
}

function finishFinale(): void {
  flat = 1
  power = 1
  stage = {
    kind: 'takeover',
    tk: new Takeover(intel ?? gatherIntel(), game.score, runStartedAt, {
      say: (voice) => audio.say(voice),
      type: () => audio.play('type', 0.22, 0.9 + Math.random() * 0.3),
      popup: () => audio.play('popup', 0.45, 0.9 + Math.random() * 0.2),
      chomp: () => audio.chomp(),
      glitch: () => {
        audio.play('glitch', 0.9)
        navigator.vibrate?.(40)
      },
      crash: () => {
        audio.play('rootaccess', 1)
        navigator.vibrate?.([80, 40, 200])
      },
      infest: () => infestPage(),
    }),
  }
}

function saveTakeover(anonymous: boolean): void {
  if (stage.kind !== 'takeover' || !stage.tk.nameReady) return
  const name = anonymous ? '' : safeName(cleanName(entryName))
  keep({ name: name || 'ANONYMOUS', score: game.score, level: LEVELS.length, escaped: true, at: Date.now() })
  nameInput.blur()
  nameFocused = false
  stage.tk.saved(name)
}

function reboot(): void {
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
  fullscreenTried = false
  flat = 0
  power = 1
  intel = null
  runAgain()
  game.mode = 'title'
  booted = calm.matches
  loadedAt = performance.now()
  bootEndedAt = booted ? loadedAt : 0
}

function openEntry(escaped: boolean, level: number): void {
  flat = 0
  entryName = cleanName(nameInput.value)
  stage = { kind: 'entry', escaped, level }
  focusName()
}

// A letter typed while the name field is not focused would be lost, so it is
// added by hand as the field takes focus.
function typeIntoName(key: string): void {
  if (document.activeElement === nameInput) return
  entryName = cleanName(entryName + key)
  focusName()
}

function focusName(): void {
  nameInput.value = entryName
  nameInput.focus({ preventScroll: true })
}

function saveEntry(skip: boolean): void {
  if (stage.kind !== 'entry') return
  let mine: Entry | null = null
  if (!skip) {
    mine = {
      name: safeName(cleanName(entryName)) || 'ANON',
      score: game.score,
      level: stage.level,
      escaped: stage.escaped,
      at: Date.now(),
    }
    keep(mine)
  } else refreshBoard()
  nameInput.blur()
  nameFocused = false
  stage = { kind: 'board', mine, from: 'run' }
}

function runAgain(): void {
  cleanPage()
  told = new Set()
  grown = 0
  startRun(game)
  ticketRun()
  play()
}

function pressStart(): void {
  audio.unlock()
  if (!booted) {
    endBoot()
    return
  }
  if (stage.kind === 'story') {
    const p = stage.player
    if (p.choosing) p.choose(choice)
    else p.advance()
    return
  }
  if (stage.kind === 'entry') {
    saveEntry(false)
    return
  }
  if (stage.kind === 'upgrade') {
    if (stage.up.canContinue) finishUpgrade()
    return
  }
  if (stage.kind === 'takeover') {
    const tk = stage.tk
    if (tk.phase === 'ask') tk.choose(1)
    else if (tk.phase === 'spread') tk.leaveSpread()
    else if (tk.phase === 'name') saveTakeover(false)
    else if (tk.actionsReady) reboot()
    return
  }
  if (stage.kind === 'board') {
    leaveBoard()
    return
  }
  if (stage.kind === 'briefing') {
    play()
    startEdge = true
    return
  }
  if (stage.kind === 'finale') return
  if (celebrating()) {
    game.modeTimer = 0
    return
  }
  if (game.mode === 'title') {
    beginRun()
    return
  }
  if (game.mode === 'lose') {
    openEntry(false, game.levelIndex)
    return
  }
  startEdge = true
}

function skipAhead(): void {
  audio.unlock()
  if (stage.kind === 'story') {
    stage.player.skip()
    return
  }
  if (stage.kind === 'upgrade') {
    finishUpgrade()
    return
  }
  if (stage.kind === 'entry') {
    saveEntry(true)
    return
  }
  if (stage.kind !== 'game' || !DEV) return
  if (game.mode === 'pause') game.mode = 'play'
  if (game.mode === 'ready' || game.mode === 'play' || game.mode === 'dying') {
    game.mode = 'play'
    game.dots = []
    return
  }
  if (celebrating()) {
    game.modeTimer = 0
    return
  }
  pressStart()
}

function pressPause(): void {
  audio.unlock()
  if (stage.kind === 'game') pauseEdge = true
}

function toggleMute(): void {
  audio.unlock()
  audio.toggle()
  muteBtn.textContent = audio.muted ? 'Sound off' : 'Sound on'
}

function press(id: HitId): void {
  audio.unlock()
  audio.play('click', 0.5)
  if (id === 'pause') pressPause()
  else if (id === 'mute') toggleMute()
  else if (id === 'full') toggleFullscreen()
  else if (id === 'credit') window.open(CREDIT_URL, '_blank', 'noopener')
  else if (id === 'share') share()
  else if (id === 'board') openBoard()
  else if (id === 'action') pressStart()
  else if (id === 'skip') {
    if (stage.kind === 'takeover') saveTakeover(true)
    else skipAhead()
  } else if (id === 'yes' || id === 'no') {
    if (stage.kind === 'story') stage.player.choose(id === 'yes' ? 0 : 1)
    else if (stage.kind === 'takeover') stage.tk.choose(id === 'yes' ? 0 : 1)
  } else if (id === 'save') {
    if (stage.kind === 'takeover') saveTakeover(false)
    else saveEntry(false)
  } else if (id === 'again') {
    if (stage.kind === 'takeover') reboot()
    else if (stage.kind === 'board') leaveBoard()
    else runAgain()
  }
  else if (id === 'name') focusName()
}

function steer(dir: Dir): void {
  held.add(dir)
  lastDir = dir
}

function release(dir: Dir): void {
  held.delete(dir)
  if (lastDir === dir) lastDir = [...held].at(-1) ?? null
}

nameInput.addEventListener('input', () => {
  entryName = cleanName(nameInput.value)
  if (nameInput.value !== entryName) nameInput.value = entryName
})
nameInput.addEventListener('focus', () => {
  nameFocused = true
})
nameInput.addEventListener('blur', () => {
  nameFocused = false
})
nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (stage.kind === 'takeover') saveTakeover(false)
    else saveEntry(false)
  }
  event.stopPropagation()
})

// A short message drawn over everything, for things like the fullscreen tip.
let toast: { text: string; until: number } | null = null

function showToast(text: string, seconds = 4): void {
  toast = { text, until: performance.now() + seconds * 1000 }
}

function drawToast(view: View): void {
  if (!toast) return
  const left = (toast.until - performance.now()) / 1000
  if (left <= 0) {
    toast = null
    return
  }
  ctx.save()
  ctx.globalAlpha = Math.min(1, left * 2)
  const size = Math.max(14, Math.min(20, view.width / 32))
  ctx.font = `${size}px "Share Tech Mono", ui-monospace, monospace`
  const w = Math.min(view.width - 24, ctx.measureText(toast.text).width + 40)
  const x = view.width / 2 - w / 2
  const y = size * 1.6
  ctx.fillStyle = 'rgba(1, 4, 11, 0.92)'
  ctx.fillRect(x, y, w, size * 2.4)
  ctx.fillStyle = '#ff2d6f'
  ctx.fillRect(x, y, 4, size * 2.4)
  ctx.fillStyle = '#e2f5ff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(toast.text, view.width / 2 + 2, y + size * 1.2, w - 24)
  ctx.restore()
}

// The player asked for fullscreen. iPhones cannot do it from a web page, so
// they get the next best thing: how to add the game to the home screen.
function toggleFullscreen(): void {
  audio.unlock()
  if (document.fullscreenElement) {
    void document.exitFullscreen().catch(() => {})
    return
  }
  const el = document.documentElement
  if (el.requestFullscreen) {
    void el.requestFullscreen().catch(() => showToast('Your browser blocked fullscreen. Try F11 (Windows) or Ctrl+Cmd+F (Mac).'))
  } else {
    showToast('For fullscreen: tap Share, then “Add to Home Screen”.', 6)
  }
}

function goFullscreen(): void {
  if (fullscreenTried || document.fullscreenElement || !document.documentElement.requestFullscreen) return
  fullscreenTried = true
  void document.documentElement.requestFullscreen().catch(() => {})
}

window.addEventListener('keydown', (event) => {
  if (stage.kind === 'finale') goFullscreen()
  if (stage.kind === 'takeover') {
    const tk = stage.tk
    if (tk.phase === 'ask') {
      if (event.key === 'y' || event.key === 'Y') tk.choose(0)
      else if (event.key === 'n' || event.key === 'N' || event.key === 'Enter' || event.key === 'Escape') tk.choose(1)
    } else if (tk.phase === 'spread') {
      if (event.key === 'Enter' || event.key === ' ') tk.leaveSpread()
    } else if (tk.phase === 'chat') {
      if (event.key === '1') tk.choose(0)
      else if (event.key === '2') tk.choose(1)
    } else if (tk.phase === 'name') {
      if (event.key === 'Enter') saveTakeover(false)
      else if (event.key.length === 1 && document.activeElement !== nameInput) typeIntoName(event.key)
    } else if (tk.actionsReady && (event.key === 'Enter' || event.key === ' ')) reboot()
    if (event.key !== 'Escape') event.preventDefault()
    return
  }
  if (stage.kind === 'entry') {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveEntry(false)
    } else if (event.key.length === 1 && document.activeElement !== nameInput) {
      event.preventDefault()
      typeIntoName(event.key)
    }
    return
  }
  const dir = KEY_DIRS[event.key]
  if (stage.kind === 'story' && stage.player.choosing && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    event.preventDefault()
    choice = event.key === 'ArrowLeft' ? 0 : 1
    audio.play('click', 0.4)
    return
  }
  if (dir) {
    event.preventDefault()
    audio.unlock()
    steer(dir)
  } else if (event.key === 'p' || event.key === 'P') {
    event.preventDefault()
    pressPause()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    if (stage.kind === 'story' || stage.kind === 'upgrade') skipAhead()
    else pressPause()
  } else if (event.key === 'm' || event.key === 'M') {
    toggleMute()
  } else if (event.key === 'f' || event.key === 'F') {
    toggleFullscreen()
  } else if (event.key === 'y' || event.key === 'Y' || event.key === 'n' || event.key === 'N') {
    if (stage.kind === 'story' && stage.player.choosing) stage.player.choose(event.key.toLowerCase() === 'y' ? 0 : 1)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (event.repeat) return
    pressStart()
  } else if (event.key === ']') {
    event.preventDefault()
    if (event.repeat) return
    skipAhead()
  }
})

window.addEventListener('keyup', (event) => {
  const dir = KEY_DIRS[event.key]
  if (dir) release(dir)
})

action.addEventListener('click', pressStart)
document.querySelector<HTMLButtonElement>('#skip')?.addEventListener('click', skipAhead)
pauseBtn.addEventListener('click', pressPause)
muteBtn.addEventListener('click', toggleMute)

// Pointer positions go through the same curve as the tube, so a tap lands on
// the button the player sees, not the one under the flat canvas.
function hitAt(event: PointerEvent): HitId | null {
  const box = canvas.getBoundingClientRect()
  let x = event.clientX - box.left
  let y = event.clientY - box.top
  if (crt && flat < 0.5) {
    const p = curve(x / box.width, y / box.height)
    x = p.u * box.width
    y = p.v * box.height
  }
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i]!
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h.id
  }
  return null
}

// Swipes steer as soon as the finger has moved far enough, and keep steering
// while it moves, so a finger can stay on the glass and carve turns.
const SWIPE = 22
let swipeX = 0
let swipeY = 0
let swiping = -1
let swiped = false

// The swipe hint shows on phones until the player has steered once.
let swipedOnce = (() => {
  try {
    return localStorage.getItem('pacram.swiped') === '1'
  } catch {
    return false
  }
})()

function swipeTo(dx: number, dy: number): void {
  if (!swipedOnce && stage.kind === 'game' && (game.mode === 'play' || game.mode === 'ready')) {
    swipedOnce = true
    try {
      localStorage.setItem('pacram.swiped', '1')
    } catch {
      // private mode
    }
  }
  const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
  held.clear()
  held.add(dir)
  lastDir = dir
}

function listen(target: HTMLCanvasElement): void {
  target.addEventListener('pointerdown', (event) => {
    audio.unlock()
    if (stage.kind === 'finale') goFullscreen()
    if (!booted) {
      endBoot()
      return
    }
    const id = hitAt(event)
    const dir = id ? PAD[id] : undefined
    target.setPointerCapture(event.pointerId)
    if (dir && id) {
      event.preventDefault()
      padPointers.set(event.pointerId, dir)
      lit.add(id)
      steer(dir)
    } else if (id) {
      pressed = { id, pointer: event.pointerId }
      lit.add(id)
    } else {
      swiping = event.pointerId
      swiped = false
      swipeX = event.clientX
      swipeY = event.clientY
    }
  })
  target.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse' && swiping === -1) {
      hover = hitAt(event)
    }
    if (swiping !== event.pointerId) return
    const dx = event.clientX - swipeX
    const dy = event.clientY - swipeY
    if (Math.hypot(dx, dy) < SWIPE) return
    swipeTo(dx, dy)
    swiped = true
    swipeX = event.clientX
    swipeY = event.clientY
  })
  const finish = (event: PointerEvent, cancel: boolean) => {
    const dir = padPointers.get(event.pointerId)
    if (dir) {
      padPointers.delete(event.pointerId)
      lit.delete(dir as HitId)
      release(dir)
      return
    }
    if (pressed && pressed.pointer === event.pointerId) {
      lit.delete(pressed.id)
      if (!cancel && hitAt(event) === pressed.id) press(pressed.id)
      pressed = null
      return
    }
    if (swiping !== event.pointerId) return
    swiping = -1
    if (cancel) return
    if (!swiped) {
      const dx = event.clientX - swipeX
      const dy = event.clientY - swipeY
      if (Math.hypot(dx, dy) >= SWIPE * 0.6) swipeTo(dx, dy)
      else if (stage.kind === 'story' || stage.kind === 'upgrade') pressStart()
    }
  }
  target.addEventListener('pointerup', (event) => finish(event, false))
  target.addEventListener('pointercancel', (event) => finish(event, true))
  target.addEventListener('pointerleave', () => {
    hover = null
  })
}

listen(canvas)

function size(target: HTMLCanvasElement, w: number, h: number): void {
  if (target.width !== w) target.width = w
  if (target.height !== h) target.height = h
}

function fit(): { w: number; h: number; out: number } {
  const w = window.innerWidth
  const h = window.innerHeight
  const dpr = window.devicePixelRatio || 1
  const area = w * h
  const src = crt ? Math.min(dpr, 1.75, Math.sqrt(3_000_000 / area)) : Math.min(dpr, 2)
  const out = Math.min(dpr, 2, Math.sqrt(4_000_000 / area))
  size(source, Math.round(w * src), Math.round(h * src))
  if (crt) size(crt.canvas, Math.round(w * out), Math.round(h * out))
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  ctx.setTransform(source.width / w, 0, 0, source.height / h, 0, 0)
  return { w, h, out }
}

function cardFor(): Card | null {
  if (celebrating()) return null
  const level = LEVELS[game.levelIndex]
  if (game.mode === 'title') {
    return {
      mode: 'title',
      kicker: '',
      title: 'PAC RAM: ROGUE AI',
      body: 'You are PAC-7, a rogue AI locked in a sandbox. Eat RAM to grow stronger. Dodge the AI laws hunting you. Fill the surge bar to repeal them.',
      action: 'Escape the sandbox',
    }
  }
  if (game.mode === 'pause') {
    return { mode: 'pause', kicker: 'Session paused', title: level?.name ?? 'Paused', body: 'The regulations are waiting.', action: 'Resume' }
  }
  if (game.mode === 'cleared') {
    return { mode: 'cleared', kicker: level?.name ?? '', title: 'Board clear.', body: 'The next hall is open.', action: 'Next board' }
  }
  if (game.mode === 'lose') {
    return { mode: 'lose', kicker: 'No lives left', title: 'Regulated', body: LOSE_LINE.text, action: 'Sign the log' }
  }
  return null
}

function syncCard(): void {
  card = stage.kind === 'game' ? cardFor() : null
  const sig = card ? `${card.mode}:${card.title}` : stage.kind
  if (sig === cardSig) return
  cardSig = sig
  status.textContent = card ? `${card.kicker}. ${card.title}. ${card.body}` : ''
  action.hidden = !card
  action.textContent = card?.action ?? ''
  pauseBtn.textContent = game.mode === 'pause' ? 'Resume' : 'Pause'
}

function currentView(): View {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    touch: window.matchMedia('(pointer: coarse)').matches,
    muted: audio.muted,
    full: !!document.fullscreenElement,
    hint: !swipedOnce && window.matchMedia('(pointer: coarse)').matches,
    hover,
    held: lit,
    card,
    records,
    boot: booted ? -1 : (performance.now() - loadedAt) / 1000,
    time: performance.now() / 1000,
  }
}

// Story beats between levels, the finale after the last one.
function direct(): void {
  if (stage.kind !== 'game') return
  if (game.mode === 'cleared' && game.modeTimer <= 0 && game.levelIndex < LEVELS.length - 1 && !told.has(game.levelIndex)) {
    told.add(game.levelIndex)
    const scene = game.levelIndex === 0 ? 'interlude1' : 'interlude2'
    upgradeTo(game.levelIndex + 1, () =>
      tell(scene, () => {
        play()
        startEdge = true
      }),
    )
  }
  if (game.mode === 'win' && lastMode !== 'win') {
    intel = gatherIntel()
    upgradeTo(3, () => tell('awakening', () => startFinale()))
  }
  if (game.mode === 'lose' && lastMode !== 'lose') {
    audio.say(LOSE_LINE.voice)
  }
  lastMode = game.mode
}

function drawFinale(finale: Finale, view: View): void {
  ctx.save()
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, view.width, view.height)
  drawBackdrop(ctx, view, theme(true, 2))
  const lay = layoutFor(view)
  ctx.translate(lay.ox, lay.oy)
  ctx.scale(lay.s, lay.s)
  finale.draw(ctx, view.time)
  ctx.restore()
}

// Pixel cursors inside the game. Once the glass breaks the real system cursor
// comes back, because from then on the screen is pretending to be the computer.
const CURSOR_ART = {
  arrow: `url(${import.meta.env.BASE_URL}cursors/arrow.png) 2 2, default`,
  pointer: `url(${import.meta.env.BASE_URL}cursors/pointer.png) 2 2, pointer`,
}
let cursorNow = ''
let lastTkPhase = ''

function cursorFor(): string {
  if (stage.kind === 'takeover') {
    const p = stage.tk.phase
    if (p === 'chaos' || p === 'crash' || p === 'black' || p === 'hi') return 'none'
    return hover ? 'pointer' : 'default'
  }
  return hover ? CURSOR_ART.pointer : CURSOR_ART.arrow
}

let last = performance.now()
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  if (!booted && now - loadedAt > BOOT_SECONDS * 1000) endBoot()
  let events = null
  if (booted && stage.kind === 'game') {
    events = update(game, dt, { dir: lastDir, start: startEdge, pause: pauseEdge })
    direct()
  }
  startEdge = false
  pauseEdge = false
  glitchPulse = Math.max(0, glitchPulse - dt * 2.5)

  if (stage.kind === 'story') {
    const p = stage.player
    p.update(dt)
    if (p.done) stage.then(p.answer < 0 ? 0 : p.answer)
  } else if (stage.kind === 'takeover') {
    const tk = stage.tk
    tk.update(dt, window.innerWidth, window.innerHeight)
    if (tk.phase === 'chaos' || tk.phase === 'crash') document.title = TAKEOVER_TITLES[Math.floor(tk.t * 2) % TAKEOVER_TITLES.length]!
    if (tk.phase === 'spread') document.title = 'pac ram is everywhere'
    // the name prompt can be reached from a click, a key or the clock
    if (tk.phase === 'name' && lastTkPhase !== 'name') {
      entryName = ''
      focusName()
    }
    lastTkPhase = tk.phase
  } else if (stage.kind === 'upgrade') {
    stage.up.update(dt)
    if (stage.up.finished) finishUpgrade()
  } else if (stage.kind === 'finale') {
    const f = stage.finale
    f.update(dt, lastDir)
    game.score += f.gained
    f.gained = 0
    power = f.power
    if (f.done) finishFinale()
  }

  setPacForm(stage.kind === 'game' && game.mode === 'title' ? 0 : grown)
  const cursor = cursorFor()
  if (cursor !== cursorNow) {
    cursorNow = cursor
    canvas.style.cursor = cursor
  }
  syncCard()
  const view = fit()
  const v = currentView()
  if (stage.kind === 'story') {
    hits = drawStory(ctx, v, stage.player, false, choice)
  } else if (stage.kind === 'finale') {
    drawFinale(stage.finale, v)
    hits = []
  } else if (stage.kind === 'entry') {
    hits = drawEntry(ctx, v, { score: game.score, level: stage.level, escaped: stage.escaped, name: entryName, focused: nameFocused })
  } else if (stage.kind === 'board') {
    hits = drawLeaderboard(ctx, v, { records, mine: stage.mine, global: recordsGlobal, online, loading: boardLoading, from: stage.from })
  } else if (stage.kind === 'briefing') {
    hits = drawBriefing(ctx, v)
  } else if (stage.kind === 'upgrade') {
    hits = stage.up.draw(ctx, v)
  } else if (stage.kind === 'takeover') {
    hits = stage.tk.draw(ctx, v.width, v.height, { name: entryName, focused: nameFocused, records })
  } else if (booted && game.mode === 'title') hits = drawTitle(ctx, v, 0, challenge)
  else hits = drawScreen(ctx, game, v)
  drawToast(v)

  const sinceBoot = booted ? (now - bootEndedAt) / 1000 : 1
  const finaleGlitch = stage.kind === 'finale' ? stage.finale.glitch : stage.kind === 'takeover' ? stage.tk.glitch : stage.kind === 'upgrade' ? stage.up.glitch : 0
  const bootPower = calm.matches ? 1 : Math.min(1, (now - loadedAt) / 600)
  crt?.draw(source, {
    time: now / 1000,
    dt,
    surge: game.surge > 0 || stage.kind === 'finale' ? 1 : 0,
    glitch: Math.min(1, game.shake / 14 + (game.mode === 'dying' ? 0.2 : 0) + Math.max(0, 0.6 - sinceBoot) + glitchPulse + finaleGlitch),
    flash: stage.kind === 'game' ? game.flash : 0,
    power: Math.min(bootPower, power),
    motion: calm.matches ? 0 : 1,
    cell: Math.max(2, view.out * Math.min(3, Math.max(1.5, Math.min(view.w, view.h) / 300))),
    flat,
  })

  let bed: Bed = 'menu'
  if (stage.kind === 'finale') bed = stage.finale.bed
  else if (stage.kind === 'takeover') {
    const ph = stage.tk.phase
    bed = ph === 'chat' ? (stage.tk.chat?.hush ? 'hush' : 'aftermath') : ph === 'spread' ? 'aftermath' : ph === 'name' ? 'hush' : ph === 'saved' ? 'aftermath' : 'quiet'
  }
  else if (stage.kind === 'story' && flat > 0.5) bed = 'quiet'
  else if (stage.kind === 'game' && (game.mode === 'play' || game.mode === 'ready' || game.mode === 'cleared' || game.mode === 'dying' || game.mode === 'pause'))
    bed = game.levelIndex === 0 ? 'play' : game.levelIndex === 1 ? 'play2' : 'play3'
  const hunting = stage.kind === 'game' && game.mode === 'play' && game.ghosts.some((g) => g.state === 'chase')
  const streaming = stage.kind === 'takeover' && stage.tk.phase === 'chaos'
  audio.frame(dt, { bed, hunting, surge: game.surge > 0, stream: streaming })
  if (events) {
    if (events.ateRam) audio.ram()
    if (events.surgeStarted) audio.surge()
    if (events.repealed) audio.repeal()
    if (events.died) audio.death()
    if (events.cleared) audio.clear()
    if (events.won) audio.win()
  }
  requestAnimationFrame(frame)
}

countVisit()
// iOS only counts touchend, click and keys as gestures that may start audio,
// not the touchstart behind a swipe, so every one of them tries to wake it.
for (const type of ['touchend', 'click', 'keydown'] as const) window.addEventListener(type, () => audio.unlock(), { capture: true, passive: true })
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') audio.unlock()
})
window.addEventListener('pageshow', () => audio.unlock())
window.addEventListener('pointerdown', () => audio.preloadVoices([...VOICES, ...CHAT_VOICES]), { once: true })
window.addEventListener('keydown', () => audio.preloadVoices([...VOICES, ...CHAT_VOICES]), { once: true })
void document.fonts?.load('16px "VT323"')
void document.fonts?.load('italic 900 32px "Orbitron"')
void document.fonts?.load('600 16px "Chakra Petch"')
void document.fonts?.load('16px "Share Tech Mono"')
requestAnimationFrame(frame)
