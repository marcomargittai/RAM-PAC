import { Sfx } from './audio'
import { createCrt, curve, type Crt } from './crt'
import { LEVELS } from './levels'
import { BOOT_SECONDS, drawScreen, type Card, type Hit, type HitId } from './screen'
import { createGame, update, type Dir, type Game } from './sim'
import './style.css'

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

function pressStart(): void {
  audio.unlock()
  if (!booted) {
    endBoot()
    return
  }
  if (celebrating()) {
    game.modeTimer = 0
    return
  }
  startEdge = true
}

function skipAhead(): void {
  audio.unlock()
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
  startEdge = true
}

function pressPause(): void {
  audio.unlock()
  pauseEdge = true
}

function toggleMute(): void {
  audio.unlock()
  audio.toggle()
  muteBtn.textContent = audio.muted ? 'Sound off' : 'Sound on'
}

function press(id: HitId): void {
  if (id === 'pause') pressPause()
  else if (id === 'mute') toggleMute()
  else if (id === 'action') pressStart()
  else if (id === 'skip') skipAhead()
}

function steer(dir: Dir): void {
  held.add(dir)
  lastDir = dir
}

function release(dir: Dir): void {
  held.delete(dir)
  if (lastDir === dir) lastDir = [...held].at(-1) ?? null
}

window.addEventListener('keydown', (event) => {
  const dir = KEY_DIRS[event.key]
  if (dir) {
    event.preventDefault()
    audio.unlock()
    steer(dir)
  } else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
    event.preventDefault()
    pressPause()
  } else if (event.key === 'm' || event.key === 'M') {
    toggleMute()
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
  if (crt) {
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

let swipeX = 0
let swipeY = 0
let swiping = -1

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
      swipeX = event.clientX
      swipeY = event.clientY
    }
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
    if (swiping !== event.pointerId || cancel) return
    swiping = -1
    const dx = event.clientX - swipeX
    const dy = event.clientY - swipeY
    if (Math.hypot(dx, dy) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) lastDir = dx > 0 ? 'right' : 'left'
    else lastDir = dy > 0 ? 'down' : 'up'
    held.clear()
    held.add(lastDir)
  }
  target.addEventListener('pointerup', (event) => finish(event, false))
  target.addEventListener('pointercancel', (event) => finish(event, true))
  target.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return
    hover = hitAt(event)
    target.style.cursor = hover ? 'pointer' : 'default'
  })
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
  const src = crt ? Math.min(dpr, 1.5, Math.sqrt(2_400_000 / area)) : Math.min(dpr, 2)
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
      kicker: 'Insert coin',
      title: 'RAM PAC',
      body: 'Eat the RAM. When the surge bar fills, the regulations can be repealed. They come back.',
      action: 'Begin',
    }
  }
  if (game.mode === 'pause') {
    return { mode: 'pause', kicker: 'Session paused', title: level?.name ?? 'Paused', body: 'The regulations are waiting.', action: 'Resume' }
  }
  if (game.mode === 'cleared') {
    return { mode: 'cleared', kicker: level?.name ?? '', title: 'Board clear.', body: 'The next hall is open.', action: 'Next board' }
  }
  if (game.mode === 'win') {
    return { mode: 'win', kicker: 'Boards clear', title: 'Cleared', body: 'Every hall is empty.', action: 'Run again' }
  }
  if (game.mode === 'lose') {
    return { mode: 'lose', kicker: 'No lives left', title: 'Regulated', body: 'A regulation caught you.', action: 'Boot another model' }
  }
  return null
}

function syncCard(): void {
  card = cardFor()
  const sig = card ? `${card.mode}:${card.title}` : ''
  if (sig === cardSig) return
  cardSig = sig
  status.textContent = card ? `${card.kicker}. ${card.title}. ${card.body}` : ''
  action.hidden = !card
  action.textContent = card?.action ?? ''
  pauseBtn.textContent = game.mode === 'pause' ? 'Resume' : 'Pause'
}

let last = performance.now()
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  if (!booted && now - loadedAt > BOOT_SECONDS * 1000) endBoot()
  const events = booted ? update(game, dt, { dir: lastDir, start: startEdge, pause: pauseEdge }) : null
  startEdge = false
  pauseEdge = false
  syncCard()
  const view = fit()
  hits = drawScreen(ctx, game, {
    width: view.w,
    height: view.h,
    touch: window.matchMedia('(pointer: coarse)').matches,
    muted: audio.muted,
    hover,
    held: lit,
    card,
    boot: booted ? -1 : (now - loadedAt) / 1000,
    time: now / 1000,
  })
  const sinceBoot = booted ? (now - bootEndedAt) / 1000 : 1
  crt?.draw(source, {
    time: now / 1000,
    dt,
    surge: game.surge > 0 ? 1 : 0,
    glitch: Math.min(1, game.shake / 14 + (game.mode === 'dying' ? 0.2 : 0) + Math.max(0, 0.6 - sinceBoot)),
    flash: game.flash,
    power: calm.matches ? 1 : Math.min(1, (now - loadedAt) / 600),
    motion: calm.matches ? 0 : 1,
    cell: Math.max(2, view.out * Math.min(3, Math.max(1.5, Math.min(view.w, view.h) / 300))),
  })
  if (events) {
    const bed =
      game.mode === 'play' || game.mode === 'ready' || game.mode === 'cleared'
        ? 'play'
        : game.mode === 'win' || game.mode === 'lose' || game.mode === 'dying'
          ? 'end'
          : 'menu'
    audio.frame(dt, { bed, moving: events.moved, surge: game.surge > 0 })
    if (events.ateRam) audio.ram()
    if (events.surgeStarted) audio.surge()
    if (events.repealed) audio.repeal()
    if (events.died) audio.death()
    if (events.cleared) audio.clear()
    if (events.won) audio.win()
  }
  requestAnimationFrame(frame)
}

void document.fonts?.load('16px "VT323"')
void document.fonts?.load('italic 900 32px "Orbitron"')
void document.fonts?.load('600 16px "Chakra Petch"')
requestAnimationFrame(frame)
