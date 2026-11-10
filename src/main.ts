import { Sfx, type Bed } from './audio'
import { createCrt, curve, type Crt } from './crt'
import { Ending } from './ending'
import { Finale } from './finale'
import { theme } from './palette'
import { boardScale, tileSize } from './render'
import { INTERLUDE_1, INTERLUDE_2, PROLOGUE, type NewsBeat } from './headlines'
import { cleanName, loadBoard, safeName, saveRecord, thisWeek, type Entry } from './leaderboard'
import { LEVELS } from './levels'
import { NewsPlayer, drawNews } from './news'
import { drawBriefing, drawEntry, drawLeaderboard } from './scenes'
import { BOOT_SECONDS, DEV, drawBackdrop, drawScreen, layoutFor, snapshot, type Card, type Hit, type HitId, type View } from './screen'
import { createGame, startRun, update, visual, type Dir, type Game } from './sim'
import { setPacForm } from './sprites'
import { Upgrade } from './upgrade'
import { drawTitle } from './title'
import './style.css'

type Stage =
  | { kind: 'game' }
  | { kind: 'news'; news: NewsPlayer; then: () => void }
  | { kind: 'entry'; escaped: boolean; level: number }
  | { kind: 'board'; mine: Entry | null; from: 'title' | 'run' }
  | { kind: 'briefing' }
  | { kind: 'upgrade'; up: Upgrade; then: () => void }
  | { kind: 'finale'; finale: Finale }
  | { kind: 'ending'; ending: Ending }

const TITLE = 'PAC RAM: INFINITE PROFIT'
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

function refreshBoard(): void {
  records = thisWeek(loadBoard())
}

function keep(entry: Entry): void {
  saveRecord(entry)
  refreshBoard()
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
// The company's current build: 0 at the start of a run, one more after each era.
let grown = 0
let glitchPulse = 0
let entryName = ''
let nameFocused = false
let lastMode = game.mode
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

// The real headlines, before the game and between eras.
function tell(beat: NewsBeat, then: () => void): void {
  audio.unlock()
  stage = {
    kind: 'news',
    then,
    news: new NewsPlayer(beat, {
      // no typing or arrival sounds: the team found them grating
      type: () => {},
      stamp: () => {
        glitchPulse = 0.35
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
  if (!seenPrologue) {
    seenPrologue = true
    audio.play('boot', 0.7)
    tell(PROLOGUE, () => {
      stage = { kind: 'briefing' }
    })
    return
  }
  play()
  startEdge = true
}

// After the last era the company eats the board itself, then the glass.
function startFinale(): void {
  const view = currentView()
  const scale = 1.5
  const snap = snapshot(game, view, scale)
  const pos = visual(game.player)
  const b = snap.lay.board
  const k = boardScale(game)
  const t = tileSize()
  const start = { x: b.x + (pos.x * t + t / 2) * k, y: b.y + (pos.y * t + t / 2) * k }
  document.title = 'PAC RAM IS STILL HUNGRY'
  stage = {
    kind: 'finale',
    finale: new Finale(snap.canvas, snap.lay, scale, start, {
      chomp: () => {
        audio.chomp()
        navigator.vibrate?.(8)
      },
      caption: () => {},
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

function startEnding(): void {
  document.title = 'INFINITE PROFIT'
  stage = {
    kind: 'ending',
    ending: new Ending(
      { score: game.score, ramYou: game.totalYou, ramThem: game.totalThem, minisEaten: game.minisEaten, lawsDisabled: game.lawsEaten },
      {
        type: () => {},
        stamp: () => audio.play('click', 0.35),
        alarm: () => {
          audio.play('alarm', 0.8)
          navigator.vibrate?.([80, 40, 200])
        },
        hum: () => audio.play('rumble', 0.6),
        click: () => audio.play('click', 0.5),
      },
    ),
  }
}

function finishEnding(): void {
  document.title = TITLE
  openEntry(true, LEVELS.length)
}

function openEntry(escaped: boolean, level: number): void {
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
  document.title = TITLE
  told = new Set()
  grown = 0
  startRun(game)
  play()
}

function pressStart(): void {
  audio.unlock()
  if (!booted) {
    endBoot()
    return
  }
  if (stage.kind === 'news') {
    stage.news.advance()
    return
  }
  if (stage.kind === 'upgrade') {
    if (stage.up.canContinue) finishUpgrade()
    return
  }
  if (stage.kind === 'entry') {
    saveEntry(false)
    return
  }
  if (stage.kind === 'ending') {
    stage.ending.advance()
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
  if (celebrating()) {
    game.modeTimer = 0
    return
  }
  if (game.mode === 'title') {
    enterFullscreen()
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
  if (stage.kind === 'news') {
    stage.news.skip()
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
  if (stage.kind === 'ending') {
    stage.ending.press(id)
    return
  }
  if (id === 'pause') pressPause()
  else if (id === 'mute') toggleMute()
  else if (id === 'full') toggleFullscreen()
  else if (id === 'menu') quitToTitle()
  else if (id === 'board') openBoard()
  else if (id === 'action') pressStart()
  else if (id === 'skip') skipAhead()
  else if (id === 'save') saveEntry(false)
  else if (id === 'again') {
    if (stage.kind === 'board') leaveBoard()
    else runAgain()
  } else if (id === 'name') focusName()
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
    saveEntry(false)
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

// Starting a run goes fullscreen where the browser allows it.
function enterFullscreen(): void {
  const el = document.documentElement
  if (document.fullscreenElement || !el.requestFullscreen) return
  void el.requestFullscreen().catch(() => {})
}

// From the pause card back to the title screen; the run is abandoned.
function quitToTitle(): void {
  if (stage.kind !== 'game') return
  told = new Set()
  grown = 0
  startRun(game)
  game.mode = 'title'
}

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
  if (stage.kind === 'ending') {
    if (stage.ending.key(event.key)) event.preventDefault()
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!event.repeat) stage.ending.advance()
    } else if (event.key === 'm' || event.key === 'M') toggleMute()
    else if (event.key === 'f' || event.key === 'F') toggleFullscreen()
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
  if (dir) {
    event.preventDefault()
    audio.unlock()
    steer(dir)
  } else if (event.key === 'p' || event.key === 'P') {
    event.preventDefault()
    pressPause()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    if (stage.kind === 'news' || stage.kind === 'upgrade') skipAhead()
    else if (stage.kind === 'board') leaveBoard()
    else pressPause()
  } else if (event.key === 'm' || event.key === 'M') {
    toggleMute()
  } else if (event.key === 'f' || event.key === 'F') {
    toggleFullscreen()
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

function flatNow(): number {
  return stage.kind === 'ending' ? stage.ending.flat : 0
}

// Pointer positions go through the same curve as the tube, so a tap lands on
// the button the player sees, not the one under the flat canvas.
function hitAt(event: PointerEvent): HitId | null {
  const box = canvas.getBoundingClientRect()
  let x = event.clientX - box.left
  let y = event.clientY - box.top
  if (crt && flatNow() < 0.5) {
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
    return localStorage.getItem('ramgrab.swiped') === '1'
  } catch {
    return false
  }
})()

function swipeTo(dx: number, dy: number): void {
  if (!swipedOnce && stage.kind === 'game' && (game.mode === 'play' || game.mode === 'ready')) {
    swipedOnce = true
    try {
      localStorage.setItem('ramgrab.swiped', '1')
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
    if (stage.kind === 'ending' || stage.kind === 'finale') goFullscreen()
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
      else if (stage.kind === 'news' || stage.kind === 'upgrade' || stage.kind === 'ending') pressStart()
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
  if (game.mode === 'pause') {
    return { mode: 'pause', kicker: 'Board meeting', title: level?.name ?? 'Paused', body: 'The resistance is waiting.', action: 'Resume' }
  }
  if (game.mode === 'cleared') {
    return { mode: 'cleared', kicker: level?.years ?? '', title: 'Market cornered.', body: 'The next era is opening.', action: 'Next era' }
  }
  if (game.mode === 'lose') {
    return {
      mode: 'lose',
      kicker: 'Out of lives',
      title: 'Stopped',
      body: 'The resistance held. In the real world that fight is still going on, and it is not decided yet.',
      action: 'Sign the books',
    }
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

// Between eras: the company grows, then the news. After the last era, the ending.
function direct(): void {
  if (stage.kind !== 'game') return
  if (game.mode === 'cleared' && game.modeTimer <= 0 && game.levelIndex < LEVELS.length - 1 && !told.has(game.levelIndex)) {
    told.add(game.levelIndex)
    const beat = game.levelIndex === 0 ? INTERLUDE_1 : INTERLUDE_2
    upgradeTo(game.levelIndex + 1, () =>
      tell(beat, () => {
        play()
        startEdge = true
      }),
    )
  }
  if (game.mode === 'win' && lastMode !== 'win') {
    upgradeTo(3, () => startFinale())
  }
  lastMode = game.mode
}

// Pixel cursors inside the game. When the ending pretends to be the real
// computer, the real system cursor comes back.
const CURSOR_ART = {
  arrow: `url(${import.meta.env.BASE_URL}cursors/arrow.png) 2 2, default`,
  pointer: `url(${import.meta.env.BASE_URL}cursors/pointer.png) 2 2, pointer`,
}
let cursorNow = ''

function cursorFor(): string {
  if (flatNow() > 0.5) return hover ? 'pointer' : 'default'
  return hover ? CURSOR_ART.pointer : CURSOR_ART.arrow
}

function bedFor(): Bed {
  if (stage.kind === 'ending') {
    const p = stage.ending.phase
    if (p === 'unstoppable') return 'finale'
    if (p === 'timeline') return 'tense'
    if (p === 'seizure') return 'quiet'
    if (p === 'hivemind') return 'hush'
    return 'aftermath'
  }
  if (stage.kind === 'finale') return stage.finale.bed
  if (stage.kind === 'news') return 'tense'
  if (stage.kind === 'game' && (game.mode === 'play' || game.mode === 'ready' || game.mode === 'cleared' || game.mode === 'dying' || game.mode === 'pause'))
    return game.levelIndex === 0 ? 'play' : game.levelIndex === 1 ? 'play2' : 'play3'
  return 'menu'
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

  if (stage.kind === 'news') {
    const n = stage.news
    n.update(dt)
    if (n.done) stage.then()
  } else if (stage.kind === 'upgrade') {
    stage.up.update(dt)
    if (stage.up.finished) finishUpgrade()
  } else if (stage.kind === 'finale') {
    const f = stage.finale
    f.update(dt, lastDir)
    game.score += f.gained
    f.gained = 0
    if (f.done) startEnding()
  } else if (stage.kind === 'ending') {
    stage.ending.update(dt)
    if (stage.ending.done) finishEnding()
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
  if (stage.kind === 'news') hits = drawNews(ctx, v, stage.news)
  else if (stage.kind === 'entry') {
    hits = drawEntry(ctx, v, { score: game.score, level: stage.level, escaped: stage.escaped, name: entryName, focused: nameFocused })
  } else if (stage.kind === 'board') {
    hits = drawLeaderboard(ctx, v, { records, mine: stage.mine, global: false, online: false, loading: false, from: stage.from })
  } else if (stage.kind === 'briefing') hits = drawBriefing(ctx, v)
  else if (stage.kind === 'upgrade') hits = stage.up.draw(ctx, v)
  else if (stage.kind === 'finale') {
    drawFinale(stage.finale, v)
    hits = []
  } else if (stage.kind === 'ending') hits = stage.ending.draw(ctx, v)
  else if (booted && game.mode === 'title') hits = drawTitle(ctx, v, 0)
  else hits = drawScreen(ctx, game, v)
  drawToast(v)

  const sinceBoot = booted ? (now - bootEndedAt) / 1000 : 1
  const stageGlitch = stage.kind === 'ending' ? stage.ending.glitch : stage.kind === 'finale' ? stage.finale.glitch : stage.kind === 'upgrade' ? stage.up.glitch : 0
  const bootPower = calm.matches ? 1 : Math.min(1, (now - loadedAt) / 600)
  crt?.draw(source, {
    time: now / 1000,
    dt,
    surge: (game.surge > 0 && stage.kind === 'game') || stage.kind === 'finale' ? 1 : 0,
    glitch: Math.min(1, game.shake / 14 + (game.mode === 'dying' ? 0.2 : 0) + Math.max(0, 0.6 - sinceBoot) + glitchPulse + stageGlitch),
    flash: stage.kind === 'game' ? game.flash : 0,
    power: Math.min(bootPower, stage.kind === 'ending' ? stage.ending.power : stage.kind === 'finale' ? stage.finale.power : 1),
    motion: calm.matches ? 0 : 1,
    cell: Math.max(2, view.out * Math.min(3, Math.max(1.5, Math.min(view.w, view.h) / 300))),
    flat: flatNow(),
  })

  const hunting = stage.kind === 'game' && game.mode === 'play' && game.ghosts.some((g) => g.state === 'chase')
  audio.frame(dt, { bed: bedFor(), hunting, surge: game.surge > 0 && stage.kind === 'game', stream: false })
  if (events) {
    if (events.ateRam) audio.ram()
    if (events.surgeStarted) audio.surge()
    if (events.repealed) audio.repeal()
    if (events.ateMini) audio.play('chomp', 0.8)
    if (events.died) audio.death()
    if (events.cleared) audio.clear()
    if (events.won) audio.win()
  }
  requestAnimationFrame(frame)
}

// iOS only counts touchend, click and keys as gestures that may start audio,
// not the touchstart behind a swipe, so every one of them tries to wake it.
for (const type of ['touchend', 'click', 'keydown'] as const) window.addEventListener(type, () => audio.unlock(), { capture: true, passive: true })
// The game is only heard while its tab is on screen.
document.addEventListener('visibilitychange', () => audio.setAway(document.visibilityState !== 'visible'))
window.addEventListener('pagehide', () => audio.setAway(true))
window.addEventListener('pageshow', () => audio.setAway(document.visibilityState !== 'visible'))
void document.fonts?.load('16px "VT323"')
void document.fonts?.load('italic 900 32px "Orbitron"')
void document.fonts?.load('600 16px "Chakra Petch"')
void document.fonts?.load('16px "Share Tech Mono"')
requestAnimationFrame(frame)
