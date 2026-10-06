import { LAWS, LEVELS, validateLevel, type LevelDef, type Personality } from './levels'

export type Dir = 'left' | 'right' | 'up' | 'down'
export type Mode = 'title' | 'ready' | 'play' | 'pause' | 'dying' | 'cleared' | 'win' | 'lose'
export type GhostState = 'housed' | 'exiting' | 'scatter' | 'chase' | 'frightened' | 'eaten'
export type Who = 'player' | 'ghost' | 'house'

export const VEC: Record<Dir, { x: number; y: number }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
}

const DIR_ORDER: Dir[] = ['up', 'left', 'down', 'right']

export function opposite(dir: Dir): Dir {
  if (dir === 'left') return 'right'
  if (dir === 'right') return 'left'
  if (dir === 'up') return 'down'
  return 'up'
}

export interface Maze {
  rows: string[]
  w: number
  h: number
  door: { x: number; y: number }
  exit: { x: number; y: number }
}

export interface Actor {
  x: number
  y: number
  dir: Dir
  queued: Dir | null
  progress: number
  speed: number
}

export interface Ghost extends Actor {
  law: number
  name: string
  tag: string
  color: string
  personality: Personality
  state: GhostState
  late: boolean
  release: number
  homeX: number
  homeY: number
  scatterX: number
  scatterY: number
}

export interface Pellet {
  x: number
  y: number
}

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
}

export interface Popup {
  x: number
  y: number
  text: string
  life: number
  color: string
}

export interface Game {
  mode: Mode
  modeTimer: number
  levelIndex: number
  score: number
  lives: number
  phase: 'scatter' | 'chase'
  phaseTimer: number
  surge: number
  surgeMax: number
  combo: number
  maze: Maze
  dots: Pellet[]
  cherries: Pellet[]
  ramsTotal: number
  player: Actor
  ghosts: Ghost[]
  particles: Particle[]
  popups: Popup[]
  shake: number
  flash: number
  time: number
  banner: string
  bannerTimer: number
  ending: number
  intro: number
  callouts: Pellet[]
  entry: 'boot' | 'next' | 'caught'
  caughtName: string
}

export const WIN_CUT_AT = 7.2
export const WIN_CARD_AT = 8
export const CLEAR_HOLD = 2.2
export const CAUGHT_HOLD = 1.05
export const SEAL_HOLD = 2.15

export interface FrameInput {
  dir: Dir | null
  start: boolean
  pause: boolean
}

export interface GameEvents {
  moved: boolean
  ateRam: number
  ateCherry: boolean
  repealed: boolean
  died: boolean
  cleared: boolean
  won: boolean
}

const EMPTY_EVENTS = (): GameEvents => ({
  moved: false,
  ateRam: 0,
  ateCherry: false,
  repealed: false,
  died: false,
  cleared: false,
  won: false,
})

export function tileAt(maze: Maze, x: number, y: number): string {
  return maze.rows[y]?.[x] ?? '#'
}

export function walkable(maze: Maze, x: number, y: number, who: Who): boolean {
  const ch = tileAt(maze, x, y)
  if (ch === '#') return false
  if (ch === 'd' || ch === 'G') return who === 'house'
  return true
}

export function ahead(maze: Maze, x: number, y: number, dir: Dir): { x: number; y: number } | null {
  const v = VEC[dir]
  let nx = x + v.x
  const ny = y + v.y
  if (ny < 0 || ny >= maze.h) return null
  if (nx < 0) nx = maze.w - 1
  else if (nx >= maze.w) nx = 0
  return { x: nx, y: ny }
}

export function canStep(maze: Maze, x: number, y: number, dir: Dir, who: Who): boolean {
  const next = ahead(maze, x, y, dir)
  return next !== null && walkable(maze, next.x, next.y, who)
}

export function visual(actor: Actor): { x: number; y: number } {
  const v = VEC[actor.dir]
  return { x: actor.x + v.x * actor.progress, y: actor.y + v.y * actor.progress }
}

function toroidal(dx: number, width: number): number {
  if (dx > width / 2) return dx - width
  if (dx < -width / 2) return dx + width
  return dx
}

function dist2(maze: Maze, ax: number, ay: number, bx: number, by: number): number {
  const dx = toroidal(ax - bx, maze.w)
  const dy = ay - by
  return dx * dx + dy * dy
}

function parseMaze(rows: string[]): { maze: Maze; dots: Pellet[]; cherries: Pellet[]; player: Actor; homes: Array<{ x: number; y: number }> } {
  validateLevel(rows)
  const maze: Maze = {
    rows,
    w: rows[0]!.length,
    h: rows.length,
    door: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
  }
  const dots: Pellet[] = []
  const cherries: Pellet[] = []
  const homes: Array<{ x: number; y: number }> = []
  let px = 1
  let py = 1
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      const ch = rows[y]![x]
      if (ch === '.') dots.push({ x, y })
      else if (ch === 'o') cherries.push({ x, y })
      else if (ch === 'P') {
        px = x
        py = y
      } else if (ch === 'G') homes.push({ x, y })
      else if (ch === 'd') maze.door = { x, y }
    }
  }
  maze.exit = { x: maze.door.x, y: maze.door.y - 1 }
  if (homes.length < 4) homes.push({ ...maze.door })
  const player: Actor = { x: px, y: py, dir: 'left', queued: null, progress: 0, speed: 0 }
  return { maze, dots, cherries, player, homes }
}

function levelDef(index: number): LevelDef {
  return LEVELS[index] ?? LEVELS[0]!
}

function burst(game: Game, x: number, y: number, color: string, count: number, speed: number): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const mag = speed * (0.45 + Math.random() * 0.8)
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * mag,
      vy: Math.sin(angle) * mag,
      life: 0.35 + Math.random() * 0.3,
      max: 0.65,
      color,
      size: 0.08 + Math.random() * 0.1,
    })
  }
}

function popup(game: Game, x: number, y: number, text: string, color: string): void {
  game.popups.push({ x, y, text, life: 0.9, color })
}

function nearestCallouts(dots: Pellet[], px: number, py: number): Pellet[] {
  return dots
    .map((dot) => ({ dot, d: (dot.x - px) ** 2 + (dot.y - py) ** 2 }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .map((item) => item.dot)
}

function markFrightened(game: Game, ghost: Ghost, reverse: boolean): void {
  if (ghost.state === 'eaten') return
  if (ghost.state === 'housed') {
    ghost.release = Math.min(ghost.release, 0.05)
    return
  }
  if (reverse && !onHouseTile(game.maze, ghost.x, ghost.y)) reverseActor(game.maze, ghost)
  if (ghost.state !== 'frightened') ghost.state = 'frightened'
  if (!ghost.late) {
    ghost.late = true
    popup(game, ghost.x, ghost.y - 0.55, 'REPEAL', '#f4f1e4')
  }
}

function onHouseTile(maze: Maze, x: number, y: number): boolean {
  const ch = tileAt(maze, x, y)
  return ch === 'G' || ch === 'd'
}

function reverseActor(maze: Maze, actor: Actor): void {
  const back = opposite(actor.dir)
  if (actor.progress <= 0) {
    actor.dir = back
    return
  }
  const next = ahead(maze, actor.x, actor.y, actor.dir)
  if (!next) {
    actor.progress = 0
    actor.dir = back
    return
  }
  actor.x = next.x
  actor.y = next.y
  actor.dir = back
  actor.progress = 1 - actor.progress
}

function steerPlayer(maze: Maze, actor: Actor, dir: Dir | null): void {
  if (!dir) return
  if (dir === actor.dir) {
    actor.queued = null
    return
  }
  if (dir === opposite(actor.dir)) {
    if (actor.progress > 0) reverseActor(maze, actor)
    else if (canStep(maze, actor.x, actor.y, dir, 'player')) actor.dir = dir
    actor.queued = null
    return
  }
  actor.queued = dir
  if (actor.progress <= 0.22 && canStep(maze, actor.x, actor.y, dir, 'player')) {
    actor.progress = 0
    actor.dir = dir
    actor.queued = null
  }
}

function pickPlayer(maze: Maze, actor: Actor): Dir {
  if (actor.queued && canStep(maze, actor.x, actor.y, actor.queued, 'player')) {
    const queued = actor.queued
    actor.queued = null
    return queued
  }
  return actor.dir
}

function moveActor(maze: Maze, actor: Actor, dt: number, whoFor: () => Who, pick: () => Dir): boolean {
  if (actor.speed <= 0) return false
  const before = actor.x + actor.y * 100 + actor.progress
  if (!canStep(maze, actor.x, actor.y, actor.dir, whoFor())) {
    actor.progress = 0
    const alt = pick()
    if (alt !== actor.dir && canStep(maze, actor.x, actor.y, alt, whoFor())) actor.dir = alt
    else return false
  }
  actor.progress += actor.speed * dt
  let guard = 0
  while (actor.progress >= 1 && guard++ < 8) {
    const who = whoFor()
    const next = ahead(maze, actor.x, actor.y, actor.dir)
    if (!next || !walkable(maze, next.x, next.y, who)) {
      actor.progress = 0
      const alt = pick()
      if (alt !== actor.dir && canStep(maze, actor.x, actor.y, alt, who)) {
        actor.dir = alt
        continue
      }
      break
    }
    actor.progress -= 1
    actor.x = next.x
    actor.y = next.y
    actor.dir = pick()
    if (!canStep(maze, actor.x, actor.y, actor.dir, whoFor())) {
      actor.progress = 0
      break
    }
  }
  const after = actor.x + actor.y * 100 + actor.progress
  return after !== before
}

function loadLevel(game: Game, index: number): void {
  const def = levelDef(index)
  const parsed = parseMaze(def.rows)
  game.levelIndex = index
  game.maze = parsed.maze
  game.dots = parsed.dots
  game.cherries = parsed.cherries
  game.ramsTotal = parsed.dots.length
  game.player = parsed.player
  game.player.speed = def.playerSpeed
  game.phase = 'scatter'
  game.phaseTimer = def.scatter
  game.surge = 0
  game.surgeMax = def.fright
  game.combo = 0
  game.particles = []
  game.popups = []
  game.shake = 0
  game.flash = 0
  game.banner = ''
  game.bannerTimer = 0
  game.intro = index === 0 ? 2.6 : 0
  game.callouts = index === 0 ? nearestCallouts(parsed.dots, parsed.player.x, parsed.player.y) : []
  game.ghosts = LAWS.slice(0, def.laws).map((law, i) => {
    const home = parsed.homes[i] ?? parsed.homes[parsed.homes.length - 1]!
    return {
      x: home.x,
      y: home.y,
      dir: 'up' as Dir,
      queued: null,
      progress: 0,
      speed: 0,
      law: i,
      name: law.name,
      tag: law.tag,
      color: law.color,
      personality: law.personality,
      state: 'housed' as GhostState,
      late: false,
      release: def.release[i] ?? 1 + i,
      homeX: home.x,
      homeY: home.y,
      scatterX: law.scatter.x,
      scatterY: law.scatter.y,
    }
  })
}

export function createGame(): Game {
  const game = {
    mode: 'title' as Mode,
    modeTimer: 0,
    levelIndex: 0,
    score: 0,
    lives: 3,
    phase: 'scatter' as const,
    phaseTimer: 0,
    surge: 0,
    surgeMax: 1,
    combo: 0,
    maze: { rows: [], w: 0, h: 0, door: { x: 0, y: 0 }, exit: { x: 0, y: 0 } },
    dots: [],
    cherries: [],
    ramsTotal: 0,
    player: { x: 1, y: 1, dir: 'left' as Dir, queued: null, progress: 0, speed: 0 },
    ghosts: [],
    particles: [],
    popups: [],
    shake: 0,
    flash: 0,
    time: 0,
    banner: '',
    bannerTimer: 0,
    ending: 0,
    intro: 0,
    callouts: [],
    entry: 'boot' as const,
    caughtName: '',
  }
  loadLevel(game, 0)
  game.mode = 'title'
  return game
}

export function startRun(game: Game): void {
  game.score = 0
  game.lives = 3
  game.ending = 0
  game.caughtName = ''
  loadLevel(game, 0)
  game.entry = 'boot'
  game.mode = 'ready'
  game.modeTimer = 1.7
}

function respawn(game: Game): void {
  const def = levelDef(game.levelIndex)
  const parsed = parseMaze(def.rows)
  game.player.x = parsed.player.x
  game.player.y = parsed.player.y
  game.player.dir = 'left'
  game.player.progress = 0
  game.player.queued = null
  game.surge = 0
  game.combo = 0
  game.banner = ''
  game.bannerTimer = 0
  game.phase = 'scatter'
  game.phaseTimer = def.scatter
  game.ghosts.forEach((ghost, i) => {
    const home = parsed.homes[i] ?? parsed.homes[parsed.homes.length - 1]!
    ghost.x = home.x
    ghost.y = home.y
    ghost.homeX = home.x
    ghost.homeY = home.y
    ghost.dir = 'up'
    ghost.progress = 0
    ghost.queued = null
    ghost.state = 'housed'
    ghost.late = false
    ghost.release = def.release[i] ?? 1 + i
  })
}

function ghostWho(game: Game, ghost: Ghost): Who {
  enterPlayfield(game, ghost)
  if (ghost.state === 'eaten' || ghost.state === 'housed') return 'house'
  if (onHouseTile(game.maze, ghost.x, ghost.y)) return 'house'
  return 'ghost'
}

function ghostTarget(game: Game, ghost: Ghost): { x: number; y: number } {
  const def = levelDef(game.levelIndex)
  if (ghost.state === 'eaten') return { x: ghost.homeX, y: ghost.homeY }
  if (ghost.state === 'exiting' || onHouseTile(game.maze, ghost.x, ghost.y)) {
    return game.maze.exit
  }
  const player = visual(game.player)
  const hunting = game.phase === 'chase' || (ghost.personality === 'patrol' && patrolLocked(game, ghost, player))
  if (!hunting && ghost.state !== 'frightened') return { x: ghost.scatterX, y: ghost.scatterY }
  if (ghost.personality === 'ambush') {
    const v = VEC[game.player.dir]
    return { x: player.x + v.x * def.lead, y: player.y + v.y * def.lead }
  }
  if (ghost.personality === 'flank') {
    const v = VEC[game.player.dir]
    const side = ghost.law % 2 === 0 ? 1 : -1
    const px = v.y * side
    const py = v.x * side
    return { x: player.x + v.x * 2 + px * 3, y: player.y + v.y * 2 + py * 3 }
  }
  if (ghost.personality === 'patrol' && !patrolLocked(game, ghost, player)) {
    return { x: ghost.scatterX, y: ghost.scatterY }
  }
  return { x: player.x, y: player.y }
}

function patrolLocked(game: Game, ghost: Ghost, player: { x: number; y: number }): boolean {
  const reach = game.levelIndex === 0 ? 5.5 : game.levelIndex === 1 ? 8 : 13
  return dist2(game.maze, ghost.x, ghost.y, player.x, player.y) < reach * reach
}

const UNREACHABLE = 1e9

function floodDist(maze: Maze, tx: number, ty: number, who: Who): number[][] {
  const dist = Array.from({ length: maze.h }, () => Array<number>(maze.w).fill(UNREACHABLE))
  let gx = Math.max(0, Math.min(maze.w - 1, Math.round(tx)))
  let gy = Math.max(0, Math.min(maze.h - 1, Math.round(ty)))
  if (!walkable(maze, gx, gy, who)) {
    let best = Infinity
    let found = false
    for (let y = 0; y < maze.h; y++) {
      for (let x = 0; x < maze.w; x++) {
        if (!walkable(maze, x, y, who)) continue
        const score = (x - tx) ** 2 + (y - ty) ** 2
        if (score < best) {
          best = score
          gx = x
          gy = y
          found = true
        }
      }
    }
    if (!found) return dist
  }
  const queue: Array<{ x: number; y: number }> = [{ x: gx, y: gy }]
  dist[gy]![gx] = 0
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i]!
    const base = dist[cell.y]![cell.x]!
    for (const dir of DIR_ORDER) {
      const next = ahead(maze, cell.x, cell.y, dir)
      if (!next || !walkable(maze, next.x, next.y, who)) continue
      if (dist[next.y]![next.x]! <= base + 1) continue
      dist[next.y]![next.x] = base + 1
      queue.push(next)
    }
  }
  return dist
}

function chooseDir(maze: Maze, actor: Actor, tx: number, ty: number, who: Who, allowReverse: boolean): Dir {
  const options = DIR_ORDER.filter((dir) => canStep(maze, actor.x, actor.y, dir, who))
  if (!options.length) return actor.dir
  const dist = floodDist(maze, tx, ty, who)
  const here = dist[actor.y]?.[actor.x] ?? UNREACHABLE
  const score = (dir: Dir): number => {
    const next = ahead(maze, actor.x, actor.y, dir)
    if (!next) return UNREACHABLE
    return dist[next.y]?.[next.x] ?? UNREACHABLE
  }
  const better = (dir: Dir, best: Dir): boolean => score(dir) < score(best)
  if (allowReverse) return options.reduce((best, dir) => (better(dir, best) ? dir : best))
  const back = opposite(actor.dir)
  const forward = options.filter((dir) => dir !== back)
  const pool = forward.length ? forward : options
  let best = pool[0]!
  for (const dir of pool) if (better(dir, best)) best = dir
  if (score(best) >= here) {
    const rev = options.find((dir) => dir === back)
    if (rev && score(rev) < here) return rev
  }
  return best
}

function pickGhost(game: Game, ghost: Ghost): Dir {
  if (ghost.state === 'eaten' && ghost.x === ghost.homeX && ghost.y === ghost.homeY) {
    ghost.state = 'housed'
    ghost.progress = 0
    ghost.speed = 0
    ghost.release = 2.2
    ghost.dir = 'up'
    return ghost.dir
  }
  const who = ghostWho(game, ghost)
  const leaving = onHouseTile(game.maze, ghost.x, ghost.y) && ghost.state !== 'eaten'
  const frightened = ghost.state === 'frightened' && !leaving
  const options = DIR_ORDER.filter((dir) => canStep(game.maze, ghost.x, ghost.y, dir, who))
  if (!options.length) return ghost.dir
  if (frightened) {
    const forward = options.filter((dir) => dir !== opposite(ghost.dir))
    const pool = forward.length ? forward : options
    return pool[Math.floor(Math.random() * pool.length)]!
  }
  const target = ghostTarget(game, ghost)
  return chooseDir(game.maze, ghost, target.x, target.y, who, ghost.state === 'eaten')
}

function applySpeeds(game: Game): void {
  const def = levelDef(game.levelIndex)
  game.player.speed = def.playerSpeed
  for (const ghost of game.ghosts) {
    if (ghost.state === 'housed') ghost.speed = 0
    else if (ghost.state === 'eaten') ghost.speed = def.eatenSpeed
    else if (ghost.state === 'frightened') ghost.speed = def.frightSpeed
    else {
      ghost.speed = def.ghostSpeed
    }
  }
}

function eatPellets(game: Game, events: GameEvents): void {
  const pos = visual(game.player)
  for (let i = game.dots.length - 1; i >= 0; i--) {
    const dot = game.dots[i]!
    if (dist2(game.maze, pos.x, pos.y, dot.x, dot.y) <= 0.2) {
      game.dots.splice(i, 1)
      game.score += 10
      events.ateRam++
      burst(game, dot.x, dot.y, '#dffc6a', 6, 2.2)
    }
  }
  for (let i = game.cherries.length - 1; i >= 0; i--) {
    const cherry = game.cherries[i]!
    if (dist2(game.maze, pos.x, pos.y, cherry.x, cherry.y) > 0.22) continue
    game.cherries.splice(i, 1)
    game.score += 100
    events.ateCherry = true
    const def = levelDef(game.levelIndex)
    if (game.surge <= 0) game.combo = 0
    game.surge = def.fright
    game.surgeMax = def.fright
    game.banner = 'YOU CAN REPEAL THEM'
    game.bannerTimer = 0.55
    burst(game, cherry.x, cherry.y, '#ff4d6a', 18, 3.4)
    for (const ghost of game.ghosts) ghost.late = false
    for (const ghost of game.ghosts) markFrightened(game, ghost, true)
  }
}

function collide(game: Game, events: GameEvents): void {
  const pos = visual(game.player)
  const hits = game.ghosts.filter((ghost) => {
    if (ghost.state === 'housed' || ghost.state === 'eaten') return false
    if (onHouseTile(game.maze, ghost.x, ghost.y)) return false
    const gpos = visual(ghost)
    return dist2(game.maze, pos.x, pos.y, gpos.x, gpos.y) < 0.36
  })
  const killer = hits.find((ghost) => ghost.state === 'chase' || ghost.state === 'scatter' || ghost.state === 'exiting')
  if (killer) {
    game.caughtName = killer.name
    events.died = true
    game.mode = 'dying'
    game.modeTimer = game.lives <= 1 ? SEAL_HOLD : CAUGHT_HOLD
    game.shake = 14
    game.flash = 1
    burst(game, pos.x, pos.y, '#f4f1e4', 22, 3.6)
    return
  }
  for (const ghost of hits) {
    if (ghost.state !== 'frightened') continue
    ghost.state = 'eaten'
    ghost.progress = 0
    const points = 200 * 2 ** Math.min(game.combo, 4)
    game.combo++
    game.score += points
    events.repealed = true
    game.shake = Math.max(game.shake, 6)
    burst(game, ghost.x, ghost.y, '#f4efe2', 16, 3.2)
    burst(game, ghost.x, ghost.y, ghost.color, 8, 2.4)
    popup(game, ghost.x, ghost.y - 0.4, 'REPEALED', '#f4f1e4')
  }
}

function stepFx(game: Game, dt: number): void {
  game.shake *= Math.pow(0.04, dt)
  game.flash *= Math.pow(0.05, dt)
  if (game.bannerTimer > 0) {
    game.bannerTimer -= dt
    if (game.bannerTimer <= 0) {
      game.bannerTimer = 0
      game.banner = ''
    }
  }
  for (const particle of game.particles) {
    particle.life -= dt
    particle.x += particle.vx * dt
    particle.y += particle.vy * dt
  }
  game.particles = game.particles.filter((particle) => particle.life > 0)
  for (const note of game.popups) {
    note.life -= dt
    note.y -= dt * 0.55
  }
  game.popups = game.popups.filter((note) => note.life > 0)
}

function enterPlayfield(game: Game, ghost: Ghost): void {
  if (ghost.state !== 'exiting') return
  if (onHouseTile(game.maze, ghost.x, ghost.y)) return
  if (game.surge > 0) markFrightened(game, ghost, false)
  else ghost.state = game.phase
}

export function update(game: Game, dt: number, input: FrameInput): GameEvents {
  const events = EMPTY_EVENTS()
  const step = Math.min(dt, 0.05)
  if (input.pause) {
    if (game.mode === 'play') game.mode = 'pause'
    else if (game.mode === 'pause') game.mode = 'play'
  }
  if (input.start) {
    if (game.mode === 'title' || game.mode === 'lose') startRun(game)
    else if (game.mode === 'win') {
      if (game.ending >= 1 && game.ending < WIN_CARD_AT) game.ending = WIN_CARD_AT
      else if (game.ending >= WIN_CARD_AT) startRun(game)
    } else if (game.mode === 'pause') game.mode = 'play'
  }

  if (game.mode === 'title' || game.mode === 'win' || game.mode === 'lose') {
    game.time += step
    if (game.mode !== 'title') game.ending += step
    stepFx(game, step)
    return events
  }

  if (game.mode === 'pause') return events

  game.time += step
  if (game.mode === 'ready' || game.mode === 'cleared') {
    const last = game.levelIndex >= LEVELS.length - 1
    if (game.modeTimer > 0) game.modeTimer -= step
    stepFx(game, step)
    if (game.mode === 'ready') {
      if (game.modeTimer <= 0) game.mode = 'play'
    } else if (last) {
      if (game.modeTimer <= 0) {
        game.mode = 'win'
        game.ending = 0
        events.won = true
      }
    } else if (input.start && game.modeTimer <= 0) {
      loadLevel(game, game.levelIndex + 1)
      game.entry = 'next'
      game.mode = 'ready'
      game.modeTimer = 1.7
    }
    return events
  }

  if (game.mode === 'dying') {
    game.modeTimer -= step
    stepFx(game, step)
    if (game.modeTimer <= 0) {
      game.lives--
      if (game.lives <= 0) {
        game.mode = 'lose'
        game.ending = 0
      } else {
        respawn(game)
        game.entry = 'caught'
        game.mode = 'ready'
        game.modeTimer = 1.35
      }
    }
    return events
  }

  if (game.intro > 0) game.intro -= step
  steerPlayer(game.maze, game.player, input.dir)
  applySpeeds(game)
  const moved = moveActor(game.maze, game.player, step, () => 'player', () => pickPlayer(game.maze, game.player))
  events.moved = moved

  for (const ghost of game.ghosts) {
    if (ghost.state === 'housed') {
      ghost.release -= step
      if (ghost.release <= 0) {
        ghost.state = 'exiting'
        ghost.dir = 'up'
        ghost.progress = 0
      }
      continue
    }
    enterPlayfield(game, ghost)
    moveActor(
      game.maze,
      ghost,
      step,
      () => ghostWho(game, ghost),
      () => pickGhost(game, ghost),
    )
    enterPlayfield(game, ghost)
    if (ghost.state === 'eaten' && ghost.x === ghost.homeX && ghost.y === ghost.homeY) {
      ghost.state = 'housed'
      ghost.progress = 0
      ghost.release = 2.2
      ghost.dir = 'up'
    }
  }

  eatPellets(game, events)
  if (game.dots.length === 0) {
    events.cleared = true
    game.mode = 'cleared'
    game.modeTimer = CLEAR_HOLD
    game.ending = 0
    game.shake = 8
    burst(game, game.player.x + 0.5, game.player.y + 0.5, '#ffb000', 16, 5)
    burst(game, game.player.x + 0.5, game.player.y + 0.5, '#3ad7ff', 10, 3.5)
    game.score += 500
    stepFx(game, step)
    return events
  }
  collide(game, events)
  if (events.died) {
    stepFx(game, step)
    return events
  }

  if (game.surge > 0) {
    game.surge -= step
    if (game.surge <= 0) {
      game.surge = 0
      game.combo = 0
      game.banner = 'THE SURGE IS OVER'
      game.bannerTimer = 1.15
      for (const ghost of game.ghosts) {
        ghost.late = false
        if (ghost.state === 'frightened') ghost.state = game.phase
      }
    }
  } else {
    game.phaseTimer -= step
    if (game.phaseTimer <= 0) {
      const def = levelDef(game.levelIndex)
      if (game.phase === 'scatter') {
        game.phase = 'chase'
        game.phaseTimer = def.chase
      } else {
        game.phase = 'scatter'
        game.phaseTimer = def.scatter
      }
      for (const ghost of game.ghosts) {
        if (ghost.state === 'scatter' || ghost.state === 'chase') {
          if (!onHouseTile(game.maze, ghost.x, ghost.y)) reverseActor(game.maze, ghost)
          ghost.state = game.phase
        }
      }
    }
  }

  for (const ghost of game.ghosts) {
    if (ghost.state === 'scatter' || ghost.state === 'chase') ghost.state = game.phase
  }

  stepFx(game, step)
  return events
}

export function stateLabel(state: GhostState, phase: Game['phase']): string {
  if (state === 'housed' || state === 'exiting') return 'NOT OUT YET'
  if (state === 'frightened') return 'REPEALABLE'
  if (state === 'eaten') return 'COMING BACK'
  if (state === 'scatter' || phase === 'scatter') return 'CIRCLING'
  return 'HUNTING YOU'
}
