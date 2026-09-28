import { Sfx } from './audio'
import { LEVELS } from './levels'
import { render, tileSize } from './render'
import { createGame, stateLabel, update, type Dir, type Game } from './sim'
import './style.css'

const game: Game = createGame()
const audio = new Sfx()
const canvas = document.querySelector<HTMLCanvasElement>('#board')!
const ctx = canvas.getContext('2d')!
const overlay = document.querySelector<HTMLElement>('#overlay')!
const kicker = document.querySelector<HTMLElement>('#ov-kicker')!
const title = document.querySelector<HTMLElement>('#ov-title')!
const body = document.querySelector<HTMLElement>('#ov-body')!
const action = document.querySelector<HTMLButtonElement>('#ov-action')!
const pills = document.querySelector<HTMLElement>('#pills')!
const scoreEl = document.querySelector<HTMLElement>('#score')!
const ramEl = document.querySelector<HTMLElement>('#ram')!
const levelEl = document.querySelector<HTMLElement>('#level')!
const livesEl = document.querySelector<HTMLElement>('#lives')!
const surgeBar = document.querySelector<HTMLElement>('#surge-bar')!
const surgeTime = document.querySelector<HTMLElement>('#surge-time')!
const lawsEl = document.querySelector<HTMLElement>('#laws')!
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

function pressStart(): void {
  audio.unlock()
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
    pressStart()
  }
})

window.addEventListener('keyup', (event) => {
  const dir = KEY_DIRS[event.key]
  if (!dir) return
  held.delete(dir)
  if (lastDir === dir) lastDir = [...held].at(-1) ?? null
})

action.addEventListener('click', pressStart)
pauseBtn.addEventListener('click', pressPause)
muteBtn.addEventListener('click', () => {
  audio.unlock()
  audio.toggle()
  muteBtn.textContent = audio.muted ? 'Sound off' : 'Sound on'
})

document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((button) => {
  const dir = button.dataset.dir as Dir
  const down = (event: Event) => {
    event.preventDefault()
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
  button.addEventListener('pointerleave', up)
  button.addEventListener('pointercancel', up)
})

let swipeX = 0
let swipeY = 0
canvas.addEventListener('pointerdown', (event) => {
  audio.unlock()
  swipeX = event.clientX
  swipeY = event.clientY
})
canvas.addEventListener('pointerup', (event) => {
  const dx = event.clientX - swipeX
  const dy = event.clientY - swipeY
  if (Math.hypot(dx, dy) < 24) return
  if (Math.abs(dx) > Math.abs(dy)) lastDir = dx > 0 ? 'right' : 'left'
  else lastDir = dy > 0 ? 'down' : 'up'
  held.clear()
  if (lastDir) held.add(lastDir)
})

function fit(): void {
  const tile = tileSize()
  const mw = game.maze.w * tile
  const mh = game.maze.h * tile
  const narrow = window.innerWidth <= 860
  const maxW = Math.min(window.innerWidth - (narrow ? 28 : 340), 760)
  const maxH = window.innerHeight - (narrow ? 300 : 150)
  const scale = Math.max(0.42, Math.min(1.15, maxW / mw, maxH / mh))
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(mw * dpr)
  canvas.height = Math.floor(mh * dpr)
  canvas.style.width = `${Math.floor(mw * scale)}px`
  canvas.style.height = `${Math.floor(mh * scale)}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function syncOverlay(): void {
  const sig = `${game.mode}:${game.levelIndex}:${game.lives}`
  if (sig === overlaySig) return
  overlaySig = sig
  const show = game.mode === 'title' || game.mode === 'pause' || game.mode === 'win' || game.mode === 'lose' || game.mode === 'cleared'
  overlay.hidden = !show
  pills.hidden = game.mode !== 'title'
  const level = LEVELS[game.levelIndex]
  if (game.mode === 'title') {
    kicker.textContent = 'AI vs Legislation'
    title.textContent = 'RAM PAC'
    body.textContent = 'Eat the RAM. Legislation hunts you — surge, and you hunt the law.'
    action.hidden = false
    action.textContent = 'Start run'
  } else if (game.mode === 'pause') {
    kicker.textContent = 'Session paused'
    title.textContent = level?.name ?? 'Paused'
    body.textContent = 'The statutes are waiting. RAM does not grow back.'
    action.hidden = false
    action.textContent = 'Resume'
  } else if (game.mode === 'cleared') {
    kicker.textContent = `Level ${game.levelIndex + 1} clear`
    title.textContent = 'RAM cleared'
    body.textContent = game.levelIndex >= LEVELS.length - 1 ? 'The stack is empty.' : 'The next statute is already drafted.'
    action.hidden = true
  } else if (game.mode === 'win') {
    kicker.textContent = 'AI vs Legislation'
    title.textContent = 'Stack cleared'
    body.textContent = 'The model ate the RAM. The law showed up late.'
    action.hidden = false
    action.textContent = 'Run again'
  } else if (game.mode === 'lose') {
    kicker.textContent = 'Contact'
    title.textContent = 'Regulated'
    body.textContent = 'A statute caught the model with RAM still on the table.'
    action.hidden = false
    action.textContent = 'Try again'
  }
}

function syncHud(): void {
  const level = LEVELS[game.levelIndex]
  scoreEl.textContent = String(game.score)
  ramEl.textContent = String(game.dots.length)
  levelEl.textContent = `${game.levelIndex + 1} ${level?.name ?? ''}`
  livesEl.textContent = game.lives > 0 ? '●'.repeat(game.lives) : '—'
  const ratio = game.surgeMax > 0 ? Math.max(0, game.surge / game.surgeMax) : 0
  surgeBar.style.width = `${ratio * 100}%`
  surgeTime.textContent = game.surge > 0 ? `${game.surge.toFixed(1)}s` : 'dormant'
  document.body.classList.toggle('surge', game.surge > 0)
  lawsEl.innerHTML = game.ghosts
    .map((ghost) => {
      const label = stateLabel(ghost.state, game.phase)
      return `<li><i style="background:${ghost.color}"></i><span>${ghost.name}</span><em>${label}</em></li>`
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
  syncOverlay()
  syncHud()
  const playing = game.mode === 'play'
  audio.frame(dt, {
    play: playing,
    moving: events.moved,
    surge: game.surge > 0,
    ramRatio: game.ramsTotal ? game.dots.length / game.ramsTotal : 1,
  })
  if (events.ateRam) audio.ram()
  if (events.ateCherry) audio.cherry()
  if (events.repealed) audio.repeal()
  if (events.died) audio.death()
  if (events.cleared) audio.clear()
  if (events.won) audio.win()
  requestAnimationFrame(frame)
}

fit()
syncOverlay()
syncHud()
requestAnimationFrame(frame)
