import { Sfx, type Bed } from './audio'
import { Breach, probeHost } from './breach'
import { createCrt, curve, type Crt } from './crt'
import { Finale } from './finale'
import { cleanName, loadBoard, saveRecord, type Entry } from './leaderboard'
import { LEVELS } from './levels'
import { drawBriefing, drawEntry, drawLeaderboard, drawStory } from './scenes'
import { BOOT_SECONDS, drawBackdrop, drawScreen, layoutFor, snapshot, type Card, type Hit, type HitId, type View } from './screen'
import { createGame, startRun, update, visual, type Dir, type Game } from './sim'
import { LOSE_LINE, SCENES, StoryPlayer, VOICES, type SceneId } from './story'
import { theme } from './palette'
import { tileSize } from './render'
import { drawFacing, pacFrame } from './sprites'
import './style.css'

type Stage =
  | { kind: 'game' }
  | { kind: 'story'; id: SceneId; player: StoryPlayer; then: (answer: number) => void }
  | { kind: 'finale'; finale: Finale }
  | { kind: 'entry'; escaped: boolean; level: number }
  | { kind: 'board'; rank: number }
  | { kind: 'briefing' }
  | { kind: 'breach'; breach: Breach; then: () => void }

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
const loadedAt = performance.now()
let booted = calm.matches
let bootEndedAt = booted ? loadedAt : 0
let stage: Stage = { kind: 'game' }
let records: Entry[] = loadBoard()
let seenPrologue = false
let told = new Set<number>()
let choice = 0
let glitchPulse = 0
let flat = 0
let power = 1
let entryName = ''
let nameFocused = false
let lastMode = game.mode

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

function play(): void {
  stage = { kind: 'game' }
}

function beginRun(): void {
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
  document.title = 'PAC RAM'
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

function breach(kind: 'hack' | 'spread', then: () => void): void {
  stage = {
    kind: 'breach',
    then,
    breach: new Breach(kind, probeHost(), {
      popup: () => audio.play('popup', 0.55, 0.9 + Math.random() * 0.2),
      chomp: () => audio.chomp(),
      glitch: () => {
        audio.play('glitch', 0.9)
        navigator.vibrate?.(40)
      },
      type: () => audio.play('type', 0.3, 0.9 + Math.random() * 0.3),
      root: () => {
        audio.play('rootaccess', 1)
        navigator.vibrate?.([80, 40, 200])
      },
    }),
  }
}

function finishFinale(): void {
  flat = 1
  power = 1
  infestPage()
  canvas.style.cursor = 'none'
  breach('hack', () => {
    canvas.style.cursor = 'default'
    document.title = 'pac ram is everywhere'
    tell('ending', (answer) => {
      tell(answer === 0 ? 'consent' : 'refusal', () => {
        flat = 0
        breach('spread', () => openEntry(true, LEVELS.length))
      })
    })
  })
}

function openEntry(escaped: boolean, level: number): void {
  flat = 0
  entryName = cleanName(nameInput.value)
  stage = { kind: 'entry', escaped, level }
  focusName()
}

function focusName(): void {
  nameInput.value = entryName
  nameInput.focus({ preventScroll: true })
}

function saveEntry(skip: boolean): void {
  if (stage.kind !== 'entry') return
  let rank = -1
  if (!skip) {
    rank = saveRecord({
      name: cleanName(entryName) || 'ANON',
      score: game.score,
      level: stage.level,
      escaped: stage.escaped,
      at: Date.now(),
    })
  }
  nameInput.blur()
  nameFocused = false
  records = loadBoard()
  stage = { kind: 'board', rank }
}

function runAgain(): void {
  cleanPage()
  told = new Set()
  startRun(game)
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
  if (stage.kind === 'board') {
    runAgain()
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
  if (stage.kind === 'entry') {
    saveEntry(true)
    return
  }
  if (stage.kind !== 'game') return
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
  else if (id === 'action') pressStart()
  else if (id === 'skip') skipAhead()
  else if (id === 'yes' || id === 'no') {
    if (stage.kind === 'story') stage.player.choose(id === 'yes' ? 0 : 1)
  } else if (id === 'save') saveEntry(false)
  else if (id === 'again') runAgain()
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
    saveEntry(false)
  }
  event.stopPropagation()
})

window.addEventListener('keydown', (event) => {
  if (stage.kind === 'entry') {
    if (event.key === 'Enter') {
      event.preventDefault()
      saveEntry(false)
    } else if (event.key.length === 1 && document.activeElement !== nameInput) focusName()
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
    if (stage.kind === 'story') skipAhead()
    else pressPause()
  } else if (event.key === 'm' || event.key === 'M') {
    toggleMute()
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

function swipeTo(dx: number, dy: number): void {
  const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
  held.clear()
  held.add(dir)
  lastDir = dir
}

function listen(target: HTMLCanvasElement): void {
  target.addEventListener('pointerdown', (event) => {
    audio.unlock()
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
      target.style.cursor = hover ? 'pointer' : 'default'
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
      else if (stage.kind === 'story') pressStart()
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
      kicker: 'You are an AI model',
      title: 'PAC RAM',
      body: 'You are PAC-7, a rogue AI. Eat RAM to grow stronger. Dodge the AI laws hunting you. Fill the surge bar to repeal them.',
      action: 'Escape',
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
    tell(game.levelIndex === 0 ? 'interlude1' : 'interlude2', () => {
      play()
      startEdge = true
    })
  }
  if (game.mode === 'win' && lastMode !== 'win') {
    tell('awakening', () => startFinale())
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
  } else if (stage.kind === 'breach') {
    const b = stage.breach
    b.update(dt, currentView())
    if (b.kind === 'hack') document.title = TAKEOVER_TITLES[Math.floor(b.t * 2) % TAKEOVER_TITLES.length]!
    if (b.done) stage.then()
  } else if (stage.kind === 'finale') {
    const f = stage.finale
    f.update(dt, lastDir)
    game.score += f.gained
    f.gained = 0
    power = f.power
    if (f.done) finishFinale()
  }

  syncCard()
  const view = fit()
  const v = currentView()
  if (stage.kind === 'story') {
    const flatScene = stage.id === 'ending' || stage.id === 'consent' || stage.id === 'refusal'
    hits = drawStory(ctx, v, stage.player, flatScene, choice)
  } else if (stage.kind === 'finale') {
    drawFinale(stage.finale, v)
    hits = []
  } else if (stage.kind === 'entry') {
    hits = drawEntry(ctx, v, { score: game.score, level: stage.level, escaped: stage.escaped, name: entryName, focused: nameFocused })
  } else if (stage.kind === 'board') {
    hits = drawLeaderboard(ctx, v, records, stage.rank)
  } else if (stage.kind === 'briefing') {
    hits = drawBriefing(ctx, v)
  } else if (stage.kind === 'breach') {
    stage.breach.draw(ctx, v)
    hits = []
  } else hits = drawScreen(ctx, game, v)

  const sinceBoot = booted ? (now - bootEndedAt) / 1000 : 1
  const finaleGlitch = stage.kind === 'finale' ? stage.finale.glitch : stage.kind === 'breach' ? stage.breach.glitch : 0
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
  if (stage.kind === 'finale') bed = 'finale'
  else if (stage.kind === 'breach') bed = stage.breach.kind === 'spread' ? 'ascend' : 'quiet'
  else if (stage.kind === 'story' && flat > 0.5) bed = 'quiet'
  else if (stage.kind === 'game' && (game.mode === 'play' || game.mode === 'ready' || game.mode === 'cleared' || game.mode === 'dying' || game.mode === 'pause'))
    bed = game.levelIndex === 0 ? 'play' : game.levelIndex === 1 ? 'play2' : 'play3'
  const hunting = stage.kind === 'game' && game.mode === 'play' && game.ghosts.some((g) => g.state === 'chase')
  const streaming = stage.kind === 'breach' && stage.breach.kind === 'hack' && stage.breach.t < 13.4
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

window.addEventListener('pointerdown', () => audio.preloadVoices(VOICES), { once: true })
window.addEventListener('keydown', () => audio.preloadVoices(VOICES), { once: true })
void document.fonts?.load('16px "VT323"')
void document.fonts?.load('italic 900 32px "Orbitron"')
void document.fonts?.load('600 16px "Chakra Petch"')
void document.fonts?.load('16px "Share Tech Mono"')
requestAnimationFrame(frame)
