import { Sfx } from './audio'
import { createCrt, type Crt } from './crt'
import { LEVELS } from './levels'
import { ERA_NAMES, render, tileSize } from './render'
import { SURGE_RAM, createGame, stateLabel, update, visual, type Dir, type Game } from './sim'
import './style.css'

const game: Game = createGame()
const audio = new Sfx()
const board = document.querySelector<HTMLCanvasElement>('#board')!
const ctx = board.getContext('2d')!
let crt: Crt | null = createCrt()
let canvas = crt ? crt.canvas : board
if (crt) {
  crt.canvas.setAttribute('aria-label', board.getAttribute('aria-label') ?? '')
  board.replaceWith(crt.canvas)
  crt.canvas.addEventListener('webglcontextlost', () => {
    crt?.canvas.replaceWith(board)
    crt = null
    canvas = board
  })
}
const stage = document.querySelector<HTMLElement>('.stage')!
const calm = window.matchMedia('(prefers-reduced-motion: reduce)')
const overlay = document.querySelector<HTMLElement>('#overlay')!
const kicker = document.querySelector<HTMLElement>('#ov-kicker')!
const title = document.querySelector<HTMLElement>('#ov-title')!
const body = document.querySelector<HTMLElement>('#ov-body')!
const loud = document.querySelector<HTMLElement>('#ov-loud')!
const action = document.querySelector<HTMLButtonElement>('#ov-action')!
const card = document.querySelector<HTMLElement>('#ov-card')!
const pills = document.querySelector<HTMLElement>('#pills')!
const scoreEl = document.querySelector<HTMLElement>('#score')!
const ramEl = document.querySelector<HTMLElement>('#ram')!
const levelEl = document.querySelector<HTMLElement>('#level')!
const livesEl = document.querySelector<HTMLElement>('#lives')!
const surgeBar = document.querySelector<HTMLElement>('#surge-bar')!
const surgeTime = document.querySelector<HTMLElement>('#surge-time')!
const surgeName = document.querySelector<HTMLElement>('#surge-name')!
const lawsEl = document.querySelector<HTMLElement>('#laws')!
const eraEl = document.querySelector<HTMLElement>('#era')!
const coordX = document.querySelector<HTMLElement>('#coord-x')!
const coordY = document.querySelector<HTMLElement>('#coord-y')!
const boot = document.querySelector<HTMLElement>('#boot')
const muteBtn = document.querySelector<HTMLButtonElement>('#mute')!
const pauseBtn = document.querySelector<HTMLButtonElement>('#pause')!

const held = new Set<Dir>()
let lastDir: Dir | null = null
let startEdge = false
let pauseEdge = false
let overlaySig = ''

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

function celebrating(): boolean {
  return game.mode === 'cleared' && game.modeTimer > 0
}

function endBoot(): void {
  if (!boot || boot.hidden) return
  boot.hidden = true
  document.body.classList.add('powered')
}

if (boot) {
  window.setTimeout(endBoot, calm.matches ? 0 : 2600)
  boot.addEventListener('pointerdown', endBoot)
}

function pressStart(): void {
  audio.unlock()
  if (boot && !boot.hidden) {
    endBoot()
    return
  }
  if (celebrating()) {
    game.modeTimer = 0
    overlaySig = ''
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
    overlaySig = ''
    return
  }
  startEdge = true
}

function pressPause(): void {
  audio.unlock()
  pauseEdge = true
}

window.addEventListener('keydown', (event) => {
  const dir = KEY_DIRS[event.key]
  if (dir) {
    event.preventDefault()
    audio.unlock()
    held.add(dir)
    lastDir = dir
  } else if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') {
    event.preventDefault()
    pressPause()
  } else if (event.key === 'm' || event.key === 'M') {
    audio.unlock()
    audio.toggle()
    muteBtn.textContent = audio.muted ? 'Sound off' : 'Sound on'
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
  if (!dir) return
  held.delete(dir)
  if (lastDir === dir) lastDir = [...held].at(-1) ?? null
})

action.addEventListener('click', pressStart)
document.querySelector<HTMLButtonElement>('#skip')?.addEventListener('click', skipAhead)
pauseBtn.addEventListener('click', pressPause)
muteBtn.addEventListener('click', () => {
  audio.unlock()
  audio.toggle()
  muteBtn.textContent = audio.muted ? 'Sound off' : 'Sound on'
})

document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((button) => {
  const dir = button.dataset.dir as Dir
  const down = (event: PointerEvent) => {
    event.preventDefault()
    button.setPointerCapture(event.pointerId)
    audio.unlock()
    held.add(dir)
    lastDir = dir
  }
  const up = () => {
    held.delete(dir)
    if (lastDir === dir) lastDir = [...held].at(-1) ?? null
  }
  button.addEventListener('pointerdown', down)
  button.addEventListener('pointerup', up)
  button.addEventListener('pointercancel', up)
})

let swipeX = 0
let swipeY = 0
stage.addEventListener('pointerdown', (event) => {
  audio.unlock()
  swipeX = event.clientX
  swipeY = event.clientY
})
stage.addEventListener('pointerup', (event) => {
  const dx = event.clientX - swipeX
  const dy = event.clientY - swipeY
  if (Math.hypot(dx, dy) < 24) return
  if (Math.abs(dx) > Math.abs(dy)) lastDir = dx > 0 ? 'right' : 'left'
  else lastDir = dy > 0 ? 'down' : 'up'
  held.clear()
  if (lastDir) held.add(lastDir)
})

function size(target: HTMLCanvasElement, w: number, h: number): void {
  if (target.width !== w) target.width = w
  if (target.height !== h) target.height = h
}

function fit(): void {
  const tile = tileSize()
  const mw = game.maze.w * tile
  const mh = game.maze.h * tile
  const narrow = window.innerWidth <= 860
  const maxW = Math.min(window.innerWidth - (narrow ? 48 : 420), 980)
  const maxH = window.innerHeight - (narrow ? 250 : 190)
  const fitted = Math.min(1.35, maxW / mw, maxH / mh)
  const scale = Math.max(narrow ? 0.32 : 0.42, fitted)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const cssW = Math.floor(mw * scale)
  const cssH = Math.floor(mh * scale)
  size(board, Math.floor(mw * dpr), Math.floor(mh * dpr))
  if (crt) size(crt.canvas, Math.floor(cssW * dpr), Math.floor(cssH * dpr))
  canvas.style.width = `${cssW}px`
  canvas.style.height = `${cssH}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function syncOverlay(): void {
  const fanfare = celebrating()
  const sig = `${game.mode}:${game.levelIndex}:${game.lives}:${game.entry}:${fanfare}`
  if (sig === overlaySig) return
  overlaySig = sig
  const show =
    !fanfare &&
    (game.mode === 'title' || game.mode === 'pause' || game.mode === 'lose' || game.mode === 'cleared' || game.mode === 'win')
  overlay.hidden = !show
  overlay.dataset.mode = game.mode
  overlay.classList.remove('cinema')
  overlay.classList.toggle('peek', game.mode === 'pause')
  card.classList.remove('story')
  pills.hidden = true
  loud.hidden = true
  const level = LEVELS[game.levelIndex]
  if (game.mode === 'title') {
    kicker.textContent = 'Insert coin'
    title.textContent = 'RAM PAC'
    body.textContent = 'Eat the orange RAM. When the surge bar fills, the regulations can be repealed. They come back.'
    action.hidden = false
    action.textContent = 'Begin'
  } else if (game.mode === 'pause') {
    kicker.textContent = 'Session paused'
    title.textContent = level?.name ?? 'Paused'
    body.textContent = 'The regulations are waiting.'
    action.hidden = false
    action.textContent = 'Resume'
  } else if (game.mode === 'cleared') {
    kicker.textContent = level?.name ?? ''
    title.textContent = 'Board clear.'
    body.textContent = 'The next hall is open.'
    action.hidden = false
    action.textContent = 'Next board'
  } else if (game.mode === 'win') {
    kicker.textContent = 'Boards clear'
    title.textContent = 'Cleared'
    body.textContent = 'Every hall is empty.'
    action.hidden = false
    action.textContent = 'Run again'
  } else if (game.mode === 'lose') {
    kicker.textContent = 'No lives left'
    title.textContent = 'Regulated'
    body.textContent = 'A regulation caught you.'
    action.hidden = false
    action.textContent = 'Boot another model'
  }
}

function syncHud(): void {
  const level = LEVELS[game.levelIndex]
  scoreEl.textContent = String(game.score)
  ramEl.textContent = String(game.dots.length)
  levelEl.textContent = `${game.levelIndex + 1} ${level?.name ?? ''}`
  const livesShown = game.mode === 'dying' ? Math.max(0, game.lives - 1) : game.lives
  livesEl.textContent = livesShown > 0 ? '▮'.repeat(livesShown) : '—'
  pauseBtn.textContent = game.mode === 'pause' ? 'Resume' : 'Pause'
  const era = Math.min(2, game.levelIndex)
  document.body.dataset.era = String(era)
  eraEl.textContent = ERA_NAMES[era] ?? ''
  const pos = visual(game.player)
  coordX.textContent = pos.x.toFixed(2).padStart(5, '0')
  coordY.textContent = pos.y.toFixed(2).padStart(5, '0')
  const surging = game.surge > 0
  const ratio = surging ? game.surge / game.surgeMax : game.surgeCharge / SURGE_RAM
  surgeBar.style.width = `${Math.max(0, Math.min(1, ratio)) * 100}%`
  surgeTime.textContent = surging ? `${game.surge.toFixed(1)}s` : `${game.surgeCharge}/${SURGE_RAM}`
  surgeName.textContent = surging ? 'REPEAL THEM' : 'EAT RAM'
  surgeName.classList.toggle('hot', surging)
  document.body.classList.toggle('surge', surging)
  lawsEl.innerHTML = game.ghosts
    .map((ghost) => {
      const label = stateLabel(ghost.state, game.phase)
      return `<li data-state="${ghost.state}" style="--law:${ghost.color}"><i></i><span>${ghost.name}</span><em>${label}</em></li>`
    })
    .join('')
}

let last = performance.now()
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  const dir = lastDir
  const events = update(game, dt, { dir, start: startEdge, pause: pauseEdge })
  startEdge = false
  pauseEdge = false
  fit()
  render(ctx, game)
  crt?.draw(board, {
    time: now / 1000,
    dt,
    surge: game.surge > 0 ? 1 : 0,
    glitch: Math.min(1, game.shake / 14 + (game.mode === 'dying' ? 0.2 : 0)),
    flash: game.flash,
    motion: calm.matches ? 0 : 1,
  })
  syncOverlay()
  syncHud()
  const bed =
    game.mode === 'play' || game.mode === 'ready' || game.mode === 'cleared'
      ? 'play'
      : game.mode === 'win' || game.mode === 'lose' || game.mode === 'dying'
        ? 'end'
        : 'menu'
  audio.frame(dt, {
    bed,
    moving: events.moved,
    surge: game.surge > 0,
  })
  if (events.ateRam) audio.ram()
  if (events.surgeStarted) audio.surge()
  if (events.repealed) audio.repeal()
  if (events.died) audio.death()
  if (events.cleared) audio.clear()
  if (events.won) audio.win()
  requestAnimationFrame(frame)
}

void document.fonts?.load('16px "VT323"')
void document.fonts?.load('italic 900 32px "Orbitron"')
fit()
syncOverlay()
syncHud()
requestAnimationFrame(frame)
