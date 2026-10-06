import { Sfx } from './audio'
import { drawComic } from './comic'
import { LEVELS } from './levels'
import { render, tileSize } from './render'
import { WIN_CARD_AT, WIN_CUT_AT, createGame, stateLabel, update, type Dir, type Game } from './sim'
import { AFTER_CLEAR, LOSE_STORY, MANUAL, OPENING, WIN_STORY, type Panel } from './story'
import './style.css'

const game: Game = createGame()
const audio = new Sfx()
const canvas = document.querySelector<HTMLCanvasElement>('#board')!
const ctx = canvas.getContext('2d')!
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
const ticker = document.querySelector<HTMLElement>('#ticker')!
const lawsEl = document.querySelector<HTMLElement>('#laws')!
const muteBtn = document.querySelector<HTMLButtonElement>('#mute')!
const pauseBtn = document.querySelector<HTMLButtonElement>('#pause')!
const comic = document.querySelector<HTMLCanvasElement>('#comic')!
const comicCtx = comic.getContext('2d')!
const caption = document.querySelector<HTMLElement>('.caption')!

const held = new Set<Dir>()
let lastDir: Dir | null = null
let startEdge = false
let pauseEdge = false
let overlaySig = ''
let cutHeard = false
let comicIndex = 0
let comicKey = ''
let sceneStamp = ''
let sceneAt = 0

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

function storyPanels(): Panel[] | null {
  if (game.mode === 'title') return [...OPENING, MANUAL]
  if (game.mode === 'cleared' && game.levelIndex < AFTER_CLEAR.length) return AFTER_CLEAR[game.levelIndex]!
  if (game.mode === 'win' && game.ending >= WIN_CARD_AT) return WIN_STORY
  if (game.mode === 'lose') return LOSE_STORY
  return null
}

function advanceStory(): boolean {
  const panels = storyPanels()
  if (!panels || comicIndex >= panels.length - 1) return false
  audio.unlock()
  comicIndex += 1
  overlaySig = ''
  return true
}

function celebrating(): boolean {
  return game.mode === 'cleared' && game.modeTimer > 0
}

function pressStart(): void {
  audio.unlock()
  if (celebrating()) {
    game.modeTimer = 0
    overlaySig = ''
    return
  }
  if (advanceStory()) return
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
  if (game.mode === 'win' && game.ending < WIN_CARD_AT) {
    game.ending = WIN_CARD_AT
    overlaySig = ''
    return
  }
  if (advanceStory()) return
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
  } else if (event.key === ']') {
    event.preventDefault()
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
  const maxW = Math.min(window.innerWidth - (narrow ? 16 : 320), 980)
  const maxH = window.innerHeight - (narrow ? 210 : 88)
  const fitted = Math.min(1.22, maxW / mw, maxH / mh)
  const scale = narrow ? Math.max(0.42, fitted) : Math.max(0.72, fitted)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(mw * dpr)
  canvas.height = Math.floor(mh * dpr)
  canvas.style.width = `${Math.floor(mw * scale)}px`
  canvas.style.height = `${Math.floor(mh * scale)}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function sceneTime(): number {
  const panels = storyPanels()
  const panel = panels?.[Math.min(comicIndex, panels.length - 1)]
  const stamp = panel ? `${game.mode}:${game.levelIndex}:${comicIndex}:${panel.scene}` : ''
  if (stamp !== sceneStamp) {
    sceneStamp = stamp
    sceneAt = game.time
  }
  return game.time - sceneAt
}

function syncOverlay(): void {
  const winCard = game.mode === 'win' && game.ending >= WIN_CARD_AT
  const storyKey = `${game.mode}:${game.levelIndex}:${winCard}`
  if (storyKey !== comicKey) {
    comicKey = storyKey
    comicIndex = 0
  }
  const panels = storyPanels()
  const panel = panels?.[Math.min(comicIndex, panels.length - 1)] ?? null
  const fanfare = celebrating()
  const sig = `${storyKey}:${game.lives}:${game.entry}:${comicIndex}:${fanfare}`
  if (sig === overlaySig) return
  overlaySig = sig
  const skipClear = game.mode === 'cleared' && game.levelIndex >= LEVELS.length - 1
  const show =
    !fanfare &&
    !skipClear &&
    (game.mode === 'title' || game.mode === 'pause' || game.mode === 'lose' || game.mode === 'cleared' || winCard)
  overlay.hidden = !show
  overlay.classList.toggle('cinema', Boolean(panel) && show)
  overlay.classList.toggle('peek', game.mode === 'pause')
  overlay.classList.toggle('gag', false)
  card.classList.toggle('story', Boolean(panel) && show)
  comic.hidden = !panel
  caption.classList.toggle('manual', Boolean(panel?.manual))
  if (panel) {
    drawComic(comicCtx, panel.scene, sceneTime())
    kicker.textContent = panel.kicker
    title.textContent = panel.year
    body.textContent = panel.caption
    loud.hidden = true
    pills.hidden = true
    action.hidden = false
    action.textContent = panel.action
    return
  }
  pills.hidden = true
  loud.hidden = true
  const level = LEVELS[game.levelIndex]
  if (game.mode === 'pause') {
    kicker.textContent = 'Session paused'
    title.textContent = level?.name ?? 'Paused'
    body.textContent = 'The regulations are waiting.'
    action.hidden = false
    action.textContent = 'Resume'
  } else if (game.mode === 'cleared') {
    kicker.textContent = level?.name ?? ''
    title.textContent =
      game.levelIndex >= LEVELS.length - 1
        ? 'The board is empty.'
        : game.levelIndex === 0
          ? 'A third regulation is in the building.'
          : 'The last board is next.'
    body.textContent = ''
    action.hidden = true
  } else if (game.mode === 'win') {
    kicker.textContent = 'THE LAST MEMORY'
    title.textContent = 'AGI'
    body.textContent = 'The city goes dark. Humanity dies.'
    action.hidden = false
    action.textContent = 'Run again'
  } else if (game.mode === 'lose') {
    kicker.textContent = 'REGULATIONS WON'
    title.textContent = 'Regulated'
    body.textContent = 'The government held the model. Humanity continues.'
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
  livesEl.textContent = livesShown > 0 ? '●'.repeat(livesShown) : '—'
  pauseBtn.textContent = game.mode === 'pause' ? 'Resume' : 'Pause'
  const ratio = game.surgeMax > 0 ? Math.max(0, game.surge / game.surgeMax) : 0
  surgeBar.style.width = `${ratio * 100}%`
  surgeTime.textContent = game.surge > 0 ? `${game.surge.toFixed(1)}s` : 'dormant'
  const edible = game.surge > 0
  surgeName.textContent = edible ? 'REPEAL THEM' : 'AI surge'
  surgeName.classList.toggle('hot', edible)
  document.body.classList.toggle('surge', edible)
  const caught = (game.mode === 'dying' && game.lives > 1) || (game.mode === 'ready' && game.entry === 'caught')
  if (game.mode === 'lose') ticker.textContent = 'REGULATED → HUMANITY CONTINUES'
  else if (caught) {
    const left = game.mode === 'dying' ? Math.max(0, game.lives - 1) : game.lives
    ticker.textContent = left === 1 ? 'CAUGHT. 1 LIFE LEFT.' : `CAUGHT. ${left} LIVES LEFT.`
  }
  else ticker.textContent = 'CLEAR THE LAST RAM → AGI → HUMANITY DIES'
  ticker.classList.toggle('down', game.mode === 'lose')
  ticker.classList.toggle('caught', caught)
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
  const livePanel = storyPanels()?.[Math.min(comicIndex, (storyPanels()?.length ?? 1) - 1)]
  if (livePanel && !overlay.hidden && !comic.hidden) drawComic(comicCtx, livePanel.scene, sceneTime())
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
  if (events.ateCherry) audio.cherry()
  if (events.repealed) audio.repeal()
  if (events.died) audio.death()
  if (events.cleared) audio.clear()
  if (events.won) audio.win()
  if (game.mode === 'win' && game.ending >= WIN_CUT_AT && !cutHeard) {
    cutHeard = true
    audio.cut()
  }
  if (game.mode !== 'win') cutHeard = false
  requestAnimationFrame(frame)
}

fit()
syncOverlay()
syncHud()
requestAnimationFrame(frame)
