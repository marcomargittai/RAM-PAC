import { LAWS, LEVELS, validateLevel } from '../src/levels'
import {
  ahead,
  canStep,
  createGame,
  marketShare,
  startRun,
  update,
  valuation,
  walkable,
  type Dir,
  type Game,
  type GameEvents,
  type Ghost,
  type GhostState,
  type Who,
} from '../src/sim'

const DIRS: Dir[] = ['up', 'left', 'down', 'right']
const IDLE = { dir: null, start: false, pause: false }
const SIZES = [15, 19, 25]
const LAW_COUNTS = [2, 4, 5]
const MINI_COUNTS = [3, 4, 6]

function fail(message: string): never {
  throw new Error(message)
}

function mode(game: Game): string {
  return game.mode
}

function advanceUntil(game: Game, seconds: number, stops: string[]): void {
  let left = seconds
  while (left > 0 && !stops.includes(mode(game))) {
    const dt = Math.min(0.05, left)
    update(game, dt, IDLE)
    left -= dt
  }
}

function park(game: Game): void {
  for (const ghost of game.ghosts) {
    ghost.state = 'housed'
    ghost.release = 1e9
    ghost.progress = 0
    ghost.speed = 0
  }
}

// Take the consumers off the board for tests that are not about them.
function noMinis(game: Game): void {
  game.minis = []
}

function isHouse(game: Game, x: number, y: number): boolean {
  const tile = game.maze.rows[y]?.[x]
  return tile === 'G' || tile === 'd'
}

// The open tile closest to (x, y), outside the ghost house.
function nearestOpen(game: Game, x: number, y: number, who: Who = 'player'): { x: number; y: number } {
  let best: { x: number; y: number } | null = null
  let score = Infinity
  for (let ty = 0; ty < game.maze.h; ty++) {
    for (let tx = 0; tx < game.maze.w; tx++) {
      if (!walkable(game.maze, tx, ty, who) || isHouse(game, tx, ty)) continue
      const d = (tx - x) ** 2 + (ty - y) ** 2
      if (d < score) {
        score = d
        best = { x: tx, y: ty }
      }
    }
  }
  if (!best) fail(`no open tile near ${x},${y}`)
  return best
}

// A wall tile on the top row: a player put there cannot move at all.
function wallSpot(game: Game): { x: number; y: number } {
  const x = game.maze.rows[0]!.indexOf('#')
  if (x < 0) fail(`level ${game.levelIndex} has no wall on its top row`)
  return { x, y: 0 }
}

function pinInWall(game: Game): void {
  const spot = wallSpot(game)
  game.player.x = spot.x
  game.player.y = spot.y
  game.player.dir = 'up'
  game.player.progress = 0
  game.player.queued = null
  game.mode = 'play'
  game.lives = 3
}

function pathDirs(game: Game, tx: number, ty: number): Dir[] | null {
  const startX = game.player.x
  const startY = game.player.y
  if (startX === tx && startY === ty) return []
  const parent = new Map<string, { x: number; y: number; dir: Dir | null }>()
  const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }]
  parent.set(`${startX},${startY}`, { x: startX, y: startY, dir: null })
  let found = false
  while (queue.length) {
    const current = queue.shift()!
    if (current.x === tx && current.y === ty) {
      found = true
      break
    }
    for (const dir of DIRS) {
      const next = ahead(game.maze, current.x, current.y, dir)
      if (!next || !walkable(game.maze, next.x, next.y, 'player')) continue
      const key = `${next.x},${next.y}`
      if (parent.has(key)) continue
      parent.set(key, { x: current.x, y: current.y, dir })
      queue.push(next)
    }
  }
  if (!found) return null
  const steps: Dir[] = []
  let cursor = `${tx},${ty}`
  while (cursor !== `${startX},${startY}`) {
    const node = parent.get(cursor)
    if (!node?.dir) return null
    steps.push(node.dir)
    cursor = `${node.x},${node.y}`
  }
  steps.reverse()
  return steps
}

function nearestDot(game: Game): { x: number; y: number } {
  let best = game.dots[0]
  let score = Infinity
  for (const dot of game.dots) {
    const dx = dot.x - game.player.x
    const dy = dot.y - game.player.y
    const dist = dx * dx + dy * dy
    if (dist < score) {
      score = dist
      best = dot
    }
  }
  if (!best) fail('no dot')
  return best
}

// Autopilot: walks to the nearest RAM until the board is empty. Laws stay housed,
// consumers roam and eat as they would in a real game. Returns simulated seconds.
function clearLevel(game: Game): number {
  const dt = 1 / 60
  let frames = 0
  let guard = 0
  const tick = (dir: Dir | null) => {
    park(game)
    update(game, dt, { dir, start: false, pause: false })
    frames++
    if (mode(game) === 'dying' || mode(game) === 'lose') fail('died while legislation was housed')
  }
  while (game.dots.length && mode(game) !== 'cleared') {
    if (guard++ > 4000) fail(`could not clear level ${game.levelIndex}, ${game.dots.length} RAM left at ${game.player.x},${game.player.y}`)
    const target = nearestDot(game)
    if (game.player.x === target.x && game.player.y === target.y) {
      game.player.progress = 0
      tick(null)
      continue
    }
    const steps = pathDirs(game, target.x, target.y)
    if (!steps?.length) fail(`no path to ${target.x},${target.y} from ${game.player.x},${game.player.y} on level ${game.levelIndex}`)
    for (const step of steps) {
      if (!game.dots.length || mode(game) === 'cleared') return frames * dt
      // a consumer got there first: pick a new target
      if (!game.dots.includes(target)) break
      const ox = game.player.x
      const oy = game.player.y
      let stepFrames = 0
      while (game.player.x === ox && game.player.y === oy) {
        if (!game.dots.length || mode(game) === 'cleared') return frames * dt
        tick(step)
        if (!game.dots.length || mode(game) === 'cleared') return frames * dt
        if (++stepFrames > 40) {
          const row = game.maze.rows[oy] ?? ''
          fail(
            `stuck stepping ${step} at ${ox},${oy} facing ${game.player.dir} progress ${game.player.progress.toFixed(2)} speed ${game.player.speed} mode ${mode(game)} can ${canStep(game.maze, ox, oy, step, 'player')} row ${row} level ${game.levelIndex}`,
          )
        }
      }
      game.player.progress = 0
    }
  }
  return frames * dt
}

function assertWalls(game: Game): void {
  game.mode = 'play'
  const ghost = game.ghosts[0]
  if (!ghost) fail('no ghost')
  const spot = nearestOpen(game, 1, 2, 'ghost')
  ghost.state = 'chase'
  ghost.x = spot.x
  ghost.y = spot.y
  ghost.progress = 0
  ghost.dir = 'left'
  for (let i = 0; i < 240 && game.mode === 'play'; i++) {
    update(game, 1 / 60, IDLE)
    for (const law of game.ghosts) {
      const who = law.state === 'eaten' || law.state === 'exiting' || law.state === 'housed' ? 'house' : 'ghost'
      if (!walkable(game.maze, law.x, law.y, who)) fail(`${law.name} inside a wall at ${law.x},${law.y}`)
      if (law.progress > 0) {
        const next = ahead(game.maze, law.x, law.y, law.dir)
        if (next && !walkable(game.maze, next.x, next.y, who)) fail(`${law.name} clipping toward ${next.x},${next.y}`)
      }
    }
  }
}

function reachLevel(level: number): Game {
  const game = createGame()
  startRun(game)
  game.mode = 'play'
  for (let i = 0; i < level; i++) {
    game.dots = []
    update(game, 0.05, IDLE)
    game.modeTimer = 0
    update(game, 0.05, { dir: null, start: true, pause: false })
    for (let f = 0; f < 180 && game.mode !== 'play'; f++) {
      update(game, 1 / 60, IDLE)
    }
  }
  if (game.levelIndex !== level || mode(game) !== 'play') fail(`could not reach level ${level}`)
  return game
}

// ---- level data ----

const seen = createGame()
if (mode(seen) !== 'title') fail('title missing')
if (LEVELS.length !== 3) fail(`need 3 levels, saw ${LEVELS.length}`)
LEVELS.forEach((def, i) => {
  try {
    validateLevel(def.rows)
  } catch (err) {
    fail(`level ${i} does not validate: ${(err as Error).message}`)
  }
  const size = SIZES[i]!
  if (def.rows.length !== size || def.rows.some((row) => row.length !== size)) fail(`level ${i} should be ${size}x${size}`)
  if (def.laws.length !== LAW_COUNTS[i]) fail(`level ${i} should have ${LAW_COUNTS[i]} laws, has ${def.laws.length}`)
  if (def.laws.some((law) => !LAWS[law])) fail(`level ${i} names a law that does not exist`)
  if (new Set(def.laws).size !== def.laws.length) fail(`level ${i} repeats a law`)
  if (def.minis.length !== MINI_COUNTS[i]) fail(`level ${i} should have ${MINI_COUNTS[i]} consumers, has ${def.minis.length}`)
  if (def.release.length < def.laws.length) fail(`level ${i} is missing release times`)
  if (def.minisEdible !== (i === LEVELS.length - 1)) fail(`level ${i} minisEdible should be ${i === LEVELS.length - 1}`)
  for (const spot of def.minis) {
    const tile = def.rows[spot.y]?.[spot.x]
    if (tile !== '.' && tile !== 'o' && tile !== ' ' && tile !== 'P') fail(`level ${i} consumer spawns on "${tile}" at ${spot.x},${spot.y}`)
  }
  if (i > 0) {
    const prev = LEVELS[i - 1]!
    if (!(def.miniSpeed < prev.miniSpeed)) fail(`consumer speed should drop on level ${i} (${prev.miniSpeed} -> ${def.miniSpeed})`)
    if (!(def.playerSpeed > prev.playerSpeed)) fail(`player speed should rise on level ${i} (${prev.playerSpeed} -> ${def.playerSpeed})`)
    if (!(def.ghostSpeed > prev.ghostSpeed)) fail(`law speed should rise on level ${i} (${prev.ghostSpeed} -> ${def.ghostSpeed})`)
  }
})

for (let level = 0; level < 3; level++) {
  const game = reachLevel(level)
  const def = LEVELS[level]!
  const { w, h } = game.maze
  if (w !== SIZES[level] || h !== SIZES[level]) fail(`level ${level} maze is ${w}x${h}`)
  if (game.ghosts.length !== def.laws.length) fail(`level ${level} spawned ${game.ghosts.length} laws`)
  game.ghosts.forEach((ghost, i) => {
    if (ghost.law !== def.laws[i]) fail(`level ${level} ghost ${i} law ${ghost.law}, expected ${def.laws[i]}`)
    if (ghost.name !== LAWS[ghost.law]!.name) fail(`level ${level} ghost ${i} is named ${ghost.name}`)
    if (![1, w - 2, Math.floor(w / 2)].includes(ghost.scatterX) || ![-2, h + 1].includes(ghost.scatterY)) {
      fail(`level ${level} ${ghost.name} scatters to ${ghost.scatterX},${ghost.scatterY}, not a corner of a ${w}x${h} maze`)
    }
  })
  const corners = new Set(game.ghosts.map((ghost) => `${ghost.scatterX},${ghost.scatterY}`))
  if (corners.size !== game.ghosts.length) fail(`level ${level} laws share a scatter corner`)
  if (game.minis.length !== def.minis.length) fail(`level ${level} spawned ${game.minis.length} consumers`)
  for (const mini of game.minis) {
    if (!walkable(game.maze, mini.x, mini.y, 'player') || isHouse(game, mini.x, mini.y)) fail(`level ${level} ${mini.name} spawned in a wall`)
    if (!(mini.speed < game.player.speed)) fail(`level ${level} ${mini.name} is not slower than the player (${mini.speed})`)
    if (mini.stash !== 0) fail(`level ${level} ${mini.name} starts with RAM`)
  }
  if (game.ramYou !== 0 || game.ramThem !== 0) fail(`level ${level} did not reset the RAM count`)
  if (game.powers.length !== 4) fail(`level ${level} spawned ${game.powers.length} power-ups`)
}

// ---- helpers ----

if (valuation(0) !== '$0M' || valuation(999) !== '$999M') fail(`valuation millions: ${valuation(999)}`)
if (valuation(1500) !== '$1.50B' || valuation(25_000) !== '$25.0B') fail(`valuation billions: ${valuation(1500)} ${valuation(25_000)}`)
if (valuation(2_500_000) !== '$2.50T') fail(`valuation trillions: ${valuation(2_500_000)}`)
{
  const game = createGame()
  startRun(game)
  if (marketShare(game) !== 1) fail('an untouched board should be all yours')
  game.ramYou = 3
  game.ramThem = 1
  if (marketShare(game) !== 0.75) fail(`market share 3:1 is ${marketShare(game)}`)
  game.ramYou = 0
  if (marketShare(game) !== 0) fail('no RAM should be no share')
}

// ---- walls and tunnels ----

for (let level = 0; level < 3; level++) {
  const probe = reachLevel(level)
  noMinis(probe)
  park(probe)
  // a corridor tile with a wall above it
  let spot: { x: number; y: number } | null = null
  for (let y = 1; y < probe.maze.h && !spot; y++) {
    for (let x = 0; x < probe.maze.w && !spot; x++) {
      if (walkable(probe.maze, x, y, 'player') && !isHouse(probe, x, y) && !canStep(probe.maze, x, y, 'up', 'player')) spot = { x, y }
    }
  }
  if (!spot) fail('no tile under a wall')
  probe.player.x = spot.x
  probe.player.y = spot.y
  probe.player.dir = 'up'
  probe.player.queued = null
  probe.player.progress = 0
  for (let i = 0; i < 40; i++) {
    park(probe)
    update(probe, 1 / 60, { dir: 'up', start: false, pause: false })
  }
  if (probe.player.y !== spot.y || !walkable(probe.maze, probe.player.x, probe.player.y, 'player')) fail(`level ${level} player clipped into a wall`)

  const last = probe.maze.w - 1
  const tunnelY = probe.maze.rows.findIndex((row) => row[0] !== '#' && row[last] !== '#')
  if (tunnelY < 0) fail(`level ${level} has no tunnel`)
  if (!canStep(probe.maze, 0, tunnelY, 'left', 'player')) fail(`level ${level} tunnel is closed`)
  probe.player.x = 0
  probe.player.y = tunnelY
  probe.player.dir = 'left'
  probe.player.queued = null
  probe.player.progress = 0
  for (let i = 0; i < 40 && probe.player.x !== last; i++) {
    park(probe)
    probe.mode = 'play'
    update(probe, 1 / 60, { dir: 'left', start: false, pause: false })
  }
  if (probe.player.x !== last) fail(`level ${level} tunnel wrap failed, x=${probe.player.x}`)
}

for (let level = 0; level < 3; level++) {
  const walls = reachLevel(level)
  noMinis(walls)
  assertWalls(walls)
}

// ---- electricity power-ups and the surge ----

const FRAME = 1 / 60

// Keep every law but `keep` locked in the house.
function holdOthers(game: Game, keep: Ghost[]): void {
  for (const ghost of game.ghosts) {
    if (keep.includes(ghost)) continue
    ghost.state = 'housed'
    ghost.release = 1e9
    ghost.progress = 0
    ghost.speed = 0
  }
}

function putPlayer(game: Game, x: number, y: number): void {
  game.player.x = x
  game.player.y = y
  game.player.progress = 0
  game.player.dir = 'left'
  game.player.queued = null
  game.mode = 'play'
}

function putGhost(ghost: Ghost, x: number, y: number, state: GhostState): void {
  ghost.x = x
  ghost.y = y
  ghost.progress = 0
  ghost.dir = 'left'
  ghost.state = state
}

// Step the player onto an electricity tile.
function grabPower(game: Game, index = 0): GameEvents {
  const cell = game.powers[index]
  if (!cell) fail(`level ${game.levelIndex} has no power-up left to grab`)
  putPlayer(game, cell.x, cell.y)
  return update(game, FRAME, IDLE)
}

function assertNeverEaten(game: Game, where: string): void {
  for (const ghost of game.ghosts) {
    if (ghost.state === 'eaten') fail(`${where}: ${ghost.name} went to the old 'eaten' state`)
  }
}

// Every board has four reachable power-ups, and they are not RAM.
for (let level = 0; level < 3; level++) {
  const def = LEVELS[level]!
  const game = reachLevel(level)
  const tiles = def.rows.join('').split('').filter((ch) => ch === 'o').length
  if (tiles !== 4 || game.powers.length !== 4) fail(`level ${level} should have 4 power-ups (tiles ${tiles}, parsed ${game.powers.length})`)
  if (!(def.power > 0)) fail(`level ${level} power lasts ${def.power}s`)
  if (level > 0 && !(def.power < LEVELS[level - 1]!.power)) fail(`power should get shorter on level ${level}`)
  if (game.ramsTotal !== game.dots.length) fail(`level ${level} ramsTotal ${game.ramsTotal} != ${game.dots.length} RAM`)
  for (const cell of game.powers) {
    if (def.rows[cell.y]![cell.x] !== 'o') fail(`level ${level} power-up at ${cell.x},${cell.y} is not an 'o' tile`)
    if (game.dots.some((dot) => dot.x === cell.x && dot.y === cell.y)) fail(`level ${level} power-up at ${cell.x},${cell.y} is also RAM`)
    if (!pathDirs(game, cell.x, cell.y)) fail(`level ${level} power-up at ${cell.x},${cell.y} is unreachable`)
  }
}

// validateLevel insists power-ups be reachable: wall in the one at 1,2 on the first board.
{
  const sealed = [...LEVELS[0]!.rows]
  if (sealed[2]![1] !== 'o') fail('expected a power-up at 1,2 on the first board')
  const wall = (x: number, y: number) => {
    sealed[y] = sealed[y]!.slice(0, x) + '#' + sealed[y]!.slice(x + 1)
  }
  wall(1, 1)
  wall(1, 3)
  wall(2, 2)
  let threw = false
  try {
    validateLevel(sealed)
  } catch (err) {
    threw = /Unreachable RAM at 1,2/.test((err as Error).message)
  }
  if (!threw) fail('validateLevel accepted a walled-in power-up')
}

// Picking one up: +50, starts the surge for def.power seconds, eats no RAM.
for (let level = 0; level < 3; level++) {
  const def = LEVELS[level]!
  const game = reachLevel(level)
  noMinis(game)
  park(game)
  const score = game.score
  const dots = game.dots.length
  const got = grabPower(game)
  if (!got.surgeStarted) fail(`level ${level} power-up did not start the surge`)
  if (game.powers.length !== 3) fail(`level ${level} power-up was not removed (${game.powers.length} left)`)
  if (game.surgeMax !== def.power) fail(`level ${level} surgeMax ${game.surgeMax}, expected ${def.power}`)
  if (game.surge > def.power || game.surge < def.power - 0.05) fail(`level ${level} surge set to ${game.surge}, expected ${def.power}`)
  if (game.score - score - got.ateRam * 10 !== 50) fail(`level ${level} power-up scored ${game.score - score}`)
  if (got.ateRam !== 0 || game.dots.length !== dots || game.ramYou !== 0) fail(`level ${level} power-up counted as RAM`)
  let elapsed = FRAME
  while (game.surge > 0 && elapsed < def.power + 3) {
    park(game)
    pinInWall(game)
    update(game, FRAME, IDLE)
    elapsed += FRAME
  }
  if (game.surge !== 0 || Math.abs(elapsed - def.power) > 0.1) fail(`level ${level} surge lasted ${elapsed.toFixed(2)}s, expected ${def.power}`)
}

// Laws already out turn frightened when the power is picked up; housed ones come out frightened.
{
  const game = reachLevel(1)
  noMinis(game)
  for (let f = 0; f < 60 * 7; f++) {
    pinInWall(game)
    game.phase = 'scatter'
    game.phaseTimer = 999
    update(game, FRAME, IDLE)
  }
  if (game.ghosts.some((ghost) => ghost.state !== 'scatter')) fail(`laws not all out before the power test: ${game.ghosts.map((g) => g.state).join(',')}`)
  // keep the laws well away from the power-up tile
  for (const ghost of game.ghosts) putGhost(ghost, game.maze.exit.x, game.maze.exit.y, 'scatter')
  grabPower(game)
  const states = game.ghosts.map((ghost) => ghost.state as string)
  if (states.some((state) => state !== 'frightened')) fail(`power-up left laws ${states.join(',')}`)
  const late = reachLevel(1)
  noMinis(late)
  grabPower(late)
  for (let f = 0; f < 60 && late.ghosts.some((ghost) => ghost.state !== 'frightened'); f++) {
    pinInWall(late)
    update(late, FRAME, IDLE)
  }
  if (late.ghosts.some((ghost) => ghost.state !== 'frightened')) fail(`housed laws did not come out frightened: ${late.ghosts.map((g) => g.state).join(',')}`)
}

// Contact without power is fatal.
{
  const death = createGame()
  startRun(death)
  death.mode = 'play'
  noMinis(death)
  death.surge = 0
  death.player.progress = 0
  const statute = death.ghosts[0]!
  statute.state = 'chase'
  statute.x = death.player.x
  statute.y = death.player.y
  statute.progress = 0
  update(death, 0.01, IDLE)
  const deathMode: string = death.mode
  if (deathMode !== 'dying') fail(`contact with legislation did not regulate the model (${deathMode})`)
  if (death.caughtName !== statute.name) fail(`caught by ${death.caughtName}, expected ${statute.name}`)
}

// Touching a frightened law switches it off where it stands. It is never removed or sent
// home, it cannot hurt you, and when the power runs out it hunts again.
for (let level = 0; level < 3; level++) {
  const def = LEVELS[level]!
  const probe = reachLevel(level)
  const { w, h } = probe.maze
  const spots = [
    nearestOpen(probe, 1, h - 1, 'ghost'),
    nearestOpen(probe, w - 2, h - 1, 'ghost'),
    nearestOpen(probe, Math.floor(w / 2), h - 2, 'ghost'),
  ].filter((spot) => !probe.powers.some((cell) => cell.x === spot.x && cell.y === spot.y))
  for (let law = 0; law < def.laws.length; law++) {
    const { x, y } = spots[law % spots.length]!
    const game = reachLevel(level)
    noMinis(game)
    const ghost = game.ghosts[law]!
    holdOthers(game, [ghost])
    putGhost(ghost, game.maze.exit.x, game.maze.exit.y, 'chase')
    const where = `level ${level} ${ghost.name}`
    grabPower(game)
    if ((ghost.state as string) !== 'frightened') fail(`${where} is ${ghost.state} after the power-up`)

    // switch it off
    putGhost(ghost, x, y, 'frightened')
    putPlayer(game, x, y)
    const score = game.score
    const hit = update(game, FRAME, IDLE)
    const after: string = ghost.state
    if (after !== 'disabled') fail(`${where} touched while frightened became ${after}`)
    if (!hit.repealed) fail(`${where} switching off did not set events.repealed`)
    if (hit.died || mode(game) !== 'play') fail(`${where} frightened law hurt the player`)
    if (game.lawsDisabled !== 1) fail(`${where} lawsDisabled ${game.lawsDisabled}`)
    if (game.score - score - hit.ateRam * 10 !== 200) fail(`${where} switching off scored ${game.score - score}`)
    if (!game.ghosts.includes(ghost)) fail(`${where} was removed from the board`)
    const stopX = ghost.x
    const stopY = ghost.y
    const stopP = ghost.progress

    // it stays put and harmless, and cannot be switched off twice
    for (let f = 0; f < 45; f++) {
      if (f < 30) putPlayer(game, stopX, stopY)
      else pinInWall(game)
      const events = update(game, FRAME, IDLE)
      if (events.died || mode(game) !== 'play') fail(`${where} hurt the player while switched off`)
      if (events.repealed || game.lawsDisabled !== 1) fail(`${where} was switched off twice in one surge`)
      if (ghost.state !== 'disabled' || ghost.speed !== 0) fail(`${where} woke early (${ghost.state}, speed ${ghost.speed})`)
      if (ghost.x !== stopX || ghost.y !== stopY || ghost.progress !== stopP) fail(`${where} moved while switched off`)
      assertNeverEaten(game, where)
    }

    // the power runs out: it is back in the hunt
    let guard = 0
    while (game.surge > 0) {
      if (guard++ > 60 * 10) fail(`${where} surge never ended`)
      pinInWall(game)
      update(game, FRAME, IDLE)
      if (game.surge > 0 && (ghost.state !== 'disabled' || ghost.x !== stopX || ghost.y !== stopY)) fail(`${where} moved before the surge ended`)
      assertNeverEaten(game, where)
    }
    const woke: string = ghost.state
    if (woke !== game.phase) fail(`${where} after the surge is ${woke}, expected ${game.phase}`)
    let moved = false
    for (let f = 0; f < 60 * 2 && !moved; f++) {
      pinInWall(game)
      update(game, FRAME, IDLE)
      assertNeverEaten(game, where)
      moved = ghost.x !== stopX || ghost.y !== stopY
    }
    if (!moved) fail(`${where} stayed switched off after the surge (${ghost.state}@${ghost.x},${ghost.y})`)
    if (ghost.state !== 'scatter' && ghost.state !== 'chase') fail(`${where} is ${ghost.state} after the surge`)
    putGhost(ghost, ghost.x, ghost.y, ghost.state)
    putPlayer(game, ghost.x, ghost.y)
    const bite = update(game, FRAME, IDLE)
    if (!bite.died && mode(game) !== 'dying') fail(`${where} was harmless after the surge`)
  }
}

// Combo: each law switched off in one surge is worth double the last; all are counted.
{
  const game = reachLevel(1)
  noMinis(game)
  const [a, b] = game.ghosts
  holdOthers(game, [a!, b!])
  putGhost(a!, game.maze.exit.x, game.maze.exit.y, 'scatter')
  putGhost(b!, game.maze.exit.x, game.maze.exit.y, 'scatter')
  grabPower(game)
  const spots = [nearestOpen(game, 1, game.maze.h - 1, 'ghost'), nearestOpen(game, game.maze.w - 2, game.maze.h - 1, 'ghost')]
  const gains: number[] = []
  ;[a!, b!].forEach((ghost, i) => {
    const spot = spots[i]!
    putGhost(ghost, spot.x, spot.y, 'frightened')
    putPlayer(game, spot.x, spot.y)
    const before = game.score
    const events = update(game, FRAME, IDLE)
    gains.push(game.score - before - events.ateRam * 10)
  })
  if (gains[0] !== 200 || gains[1] !== 400) fail(`combo scored ${gains.join(', ')}`)
  if (game.lawsDisabled !== 2 || a!.state !== 'disabled' || b!.state !== 'disabled') fail(`combo left lawsDisabled ${game.lawsDisabled}`)
  // a second power-up mid-surge does not wake or re-arm switched-off laws
  const again = grabPower(game)
  if (!again.surgeStarted || a!.state !== 'disabled' || b!.state !== 'disabled') fail('a second power-up changed the switched-off laws')
  putPlayer(game, a!.x, a!.y)
  const retouch = update(game, FRAME, IDLE)
  if (retouch.repealed || game.lawsDisabled !== 2) fail('a switched-off law scored again after a second power-up')
}

// The board clears when the RAM is gone, even with power-ups left.
for (let level = 0; level < 3; level++) {
  const game = reachLevel(level)
  noMinis(game)
  park(game)
  const last = game.dots[0]!
  game.dots = [last]
  putPlayer(game, last.x, last.y)
  const events = update(game, FRAME, IDLE)
  if (!events.cleared || mode(game) !== 'cleared') fail(`level ${level} did not clear with power-ups left (${mode(game)})`)
  if (game.powers.length !== 4) fail(`level ${level} power-ups changed on clear (${game.powers.length})`)
}

// ---- full run by the autopilot ----

const run = createGame()
startRun(run)
advanceUntil(run, 3, ['play'])
if (mode(run) !== 'play') fail(`ready did not start play (${mode(run)})`)
const pacing: string[] = []
let ramSoFar = 0
for (let level = 0; level < 3; level++) {
  if (run.levelIndex !== level) fail(`expected level ${level}, saw ${run.levelIndex}`)
  if (run.ghosts.length !== LAW_COUNTS[level]) fail(`level ${level} ghost count ${run.ghosts.length}`)
  if (run.minis.length !== MINI_COUNTS[level]) fail(`level ${level} consumer count ${run.minis.length}`)
  const rams = run.dots.length
  ramSoFar += rams
  const seconds = clearLevel(run)
  const clearedMode: string = run.mode
  if (clearedMode !== 'cleared') fail(`level ${level} did not clear after ${rams} RAM (${clearedMode})`)
  if (run.ramYou + run.ramThem !== rams) fail(`level ${level} RAM does not add up: you ${run.ramYou} + them ${run.ramThem} != ${rams}`)
  if (run.totalYou + run.totalThem !== ramSoFar) fail(`run RAM does not add up after level ${level}`)
  const stash = run.minis.reduce((sum, mini) => sum + mini.stash, 0)
  if (stash !== run.ramThem) fail(`level ${level} consumer stash ${stash} != ramThem ${run.ramThem}`)
  pacing.push(
    `L${level} ${run.maze.w}x${run.maze.h}: ${seconds.toFixed(1)}s, RAM ${rams} (you ${run.ramYou}, them ${run.ramThem}, share ${(marketShare(run) * 100).toFixed(0)}%)`,
  )
  if (level < 2) {
    run.modeTimer = 0
    update(run, 0.05, { dir: null, start: true, pause: false })
  }
  advanceUntil(run, 3, level < 2 ? ['ready'] : ['win'])
  if (level < 2) {
    if (mode(run) !== 'ready' || run.levelIndex !== level + 1) fail(`next level failed from ${level} (${mode(run)} ${run.levelIndex})`)
    if (run.ramYou !== 0 || run.ramThem !== 0) fail('board RAM count did not reset')
    advanceUntil(run, 3, ['play'])
    if (mode(run) !== 'play') fail(`next level did not resume (${mode(run)})`)
  }
}
const endMode: string = run.mode
if (endMode !== 'win') fail(`full run should win, mode=${endMode}`)

// ---- laws leave the house ----

for (let level = 0; level < 3; level++) {
  const game = reachLevel(level)
  noMinis(game)
  const seenOut = game.ghosts.map(() => false)
  for (let f = 0; f < 60 * 10; f++) {
    pinInWall(game)
    update(game, 1 / 60, IDLE)
    assertNeverEaten(game, `level ${level} release`)
    game.ghosts.forEach((ghost, i) => {
      if (ghost.state !== 'housed' && !isHouse(game, ghost.x, ghost.y)) seenOut[i] = true
    })
  }
  if (seenOut.some((out) => !out)) {
    fail(`level ${level} kept a regulation inside: ${game.ghosts.map((ghost, i) => `${ghost.name}:${seenOut[i]}`).join(' ')}`)
  }
}
// Each law that targets the player itself, released alone in chase mode, reaches a still
// player. (Flankers aim beside the player by design, so a still player can dodge them.)
for (let level = 0; level < 3; level++) {
  const def = LEVELS[level]!
  for (let index = 0; index < def.laws.length; index++) {
    if (LAWS[def.laws[index]!]!.personality === 'flank') continue
    const game = reachLevel(level)
    noMinis(game)
    for (const ghost of game.ghosts) {
      ghost.state = 'housed'
      ghost.release = 1e9
    }
    const hunter = game.ghosts[index]!
    hunter.state = 'chase'
    hunter.x = game.maze.exit.x
    hunter.y = game.maze.exit.y
    hunter.progress = 0
    hunter.dir = 'left'
    game.phase = 'chase'
    game.phaseTimer = 999
    const spot = nearestOpen(game, 1, 2)
    game.player.x = spot.x
    game.player.y = spot.y
    game.player.dir = 'up'
    game.player.progress = 0
    game.mode = 'play'
    let responded = false
    for (let f = 0; f < 60 * 18; f++) {
      game.phase = 'chase'
      game.phaseTimer = 999
      for (const ghost of game.ghosts) {
        if (ghost !== hunter) {
          ghost.state = 'housed'
          ghost.release = 1e9
        }
      }
      const modeBefore: string = game.mode
      if (modeBefore !== 'play' && modeBefore !== 'dying') game.mode = 'play'
      const events = update(game, 1 / 60, IDLE)
      const modeAfter: string = game.mode
      if (events.died || modeAfter === 'dying') {
        responded = true
        break
      }
    }
    if (!responded) {
      fail(`level ${level} ${hunter.name} chase did not reach the player (${hunter.state}@${hunter.x},${hunter.y})`)
    }
  }
}

// ---- consumers ----

// Consumers eat RAM for themselves: it is theirs, not the player's, and never starts a surge.
for (let level = 0; level < 3; level++) {
  const game = reachLevel(level)
  park(game)
  pinInWall(game)
  const thief = game.minis[0]!
  game.minis = [thief]
  const ram = game.dots[Math.floor(game.dots.length / 2)]!
  thief.x = ram.x
  thief.y = ram.y
  thief.progress = 0
  thief.speed = 0
  const score = game.score
  const dots = game.dots.length
  const stolen = update(game, 0.01, IDLE)
  if (game.dots.length !== dots - 1) fail(`level ${level} consumer did not eat RAM`)
  if (thief.stash !== 1) fail(`level ${level} consumer stash is ${thief.stash}`)
  if (game.ramThem !== 1 || game.totalThem !== 1) fail(`level ${level} ramThem ${game.ramThem} totalThem ${game.totalThem}`)
  if (game.ramYou !== 0 || game.totalYou !== 0) fail(`level ${level} stolen RAM was counted for the player`)
  if (game.score !== score || stolen.ateRam !== 0) fail(`level ${level} stolen RAM counted toward the player score`)
  if (game.surge !== 0 || stolen.surgeStarted || game.powers.length !== 4) fail(`level ${level} stolen RAM changed the surge`)
  if (marketShare(game) !== 0) fail('market share should be 0 when only consumers ate')
}

// Consumers never pick up power-ups: not when parked on one, not while roaming.
for (let level = 0; level < 3; level++) {
  const game = reachLevel(level)
  park(game)
  pinInWall(game)
  game.minis.forEach((mini, i) => {
    const cell = game.powers[i % game.powers.length]!
    mini.x = cell.x
    mini.y = cell.y
    mini.progress = 0
  })
  const speeds = game.minis.map((mini) => mini.speed)
  for (const mini of game.minis) mini.speed = 0
  const score = game.score
  for (let f = 0; f < 20; f++) {
    park(game)
    pinInWall(game)
    const events = update(game, FRAME, IDLE)
    if (events.surgeStarted || game.surge !== 0) fail(`level ${level} a consumer on a power-up started the surge`)
  }
  if (game.powers.length !== 4) fail(`level ${level} a consumer took a power-up (${game.powers.length} left)`)
  game.minis.forEach((mini, i) => (mini.speed = speeds[i]!))
  for (let f = 0; f < 60 * 30 && mode(game) === 'play'; f++) {
    park(game)
    pinInWall(game)
    const events = update(game, FRAME, IDLE)
    if (events.surgeStarted || game.surge !== 0) fail(`level ${level} a roaming consumer started the surge`)
  }
  if (game.powers.length !== 4) fail(`level ${level} roaming consumers took power-ups (${game.powers.length} left)`)
  if (game.score !== score) fail(`level ${level} consumers scored for the player (${game.score - score})`)
}

// Levels 0-1: consumers are off limits. Touching one does nothing, and they are harmless.
for (let level = 0; level < 2; level++) {
  const game = reachLevel(level)
  park(game)
  const mini = game.minis[0]!
  mini.stash = 5
  game.ramThem = 5
  game.totalThem = 5
  const spot = nearestOpen(game, mini.x, mini.y)
  for (const other of game.minis) {
    other.x = spot.x
    other.y = spot.y
    other.progress = 0
    other.speed = 0
  }
  game.player.x = spot.x
  game.player.y = spot.y
  game.player.progress = 0
  game.player.queued = null
  const count = game.minis.length
  for (let f = 0; f < 30; f++) {
    park(game)
    game.player.x = spot.x
    game.player.y = spot.y
    game.player.progress = 0
    const events = update(game, 1 / 60, IDLE)
    if (events.ateMini) fail(`level ${level} reported eating a consumer`)
    if (mode(game) !== 'play') fail(`level ${level} touching a consumer changed mode to ${mode(game)}`)
  }
  if (game.minis.length !== count) fail(`level ${level} player ate a consumer`)
  if (game.minisEaten !== 0) fail(`level ${level} minisEaten is ${game.minisEaten}`)
  if (mini.stash !== 5 || game.ramThem < 5 || game.totalThem < 5) fail(`level ${level} touching a consumer moved its RAM`)
}

// Last level: the player eats consumers and takes their RAM.
{
  const level = LEVELS.length - 1
  const game = reachLevel(level)
  park(game)
  const thief = game.minis[0]!
  thief.stash = 7
  game.ramThem = 7
  game.totalThem = 7
  game.ramYou = 2
  game.totalYou = 2
  for (const mini of game.minis) {
    mini.speed = 0
    mini.progress = 0
  }
  const others = game.minis.slice(1)
  const far = nearestOpen(game, game.maze.w - 1, game.maze.h - 1)
  for (const other of others) {
    other.x = far.x
    other.y = far.y
  }
  game.player.x = thief.x
  game.player.y = thief.y
  game.player.progress = 0
  game.player.queued = null
  game.player.dir = 'up'
  const count = game.minis.length
  const score = game.score
  const ate = update(game, 1 / 60, IDLE)
  if (!ate.ateMini) fail('eating a consumer did not set events.ateMini')
  if (game.minis.length !== count - 1 || game.minis.includes(thief)) fail('eaten consumer is still in the maze')
  if (game.minisEaten !== 1) fail(`minisEaten is ${game.minisEaten}`)
  if (game.ramYou < 9 || game.totalYou < 9) fail(`consumer RAM did not go to the player (${game.ramYou}/${game.totalYou})`)
  const leftover = game.minis.reduce((sum, mini) => sum + mini.stash, 0)
  if (game.ramThem !== leftover || game.totalThem !== leftover) fail(`consumer RAM was not taken from them (${game.ramThem}/${game.totalThem})`)
  if (game.score < score + 100 + 70) fail(`eating a consumer scored ${game.score - score}`)
  if (game.surge !== 0 || ate.surgeStarted) fail('eating a consumer started a surge')

  const gone = game.minis.length
  for (let i = 0; i < 90; i++) {
    park(game)
    pinInWall(game)
    update(game, 1 / 60, IDLE)
  }
  if (game.minis.length !== gone) fail(`consumer count went ${gone} -> ${game.minis.length} with no one eating`)

  const alive = game.minis.length
  const statute = game.ghosts[0]!
  const start = nearestOpen(game, game.maze.w / 2, game.maze.h - 2)
  game.player.x = start.x
  game.player.y = start.y
  game.player.progress = 0
  statute.state = 'chase'
  statute.x = game.player.x
  statute.y = game.player.y
  statute.progress = 0
  game.surge = 0
  game.mode = 'play'
  update(game, 0.01, IDLE)
  if (mode(game) !== 'dying') fail('consumer test did not reach a death')
  while (mode(game) === 'dying') update(game, 0.05, IDLE)
  if (game.minis.length !== alive) fail('dying brought consumers back')
  advanceUntil(game, 3, ['play'])
  if (game.minis.length !== alive) fail('the next life respawned consumers')

  startRun(game)
  if (game.minis.length !== MINI_COUNTS[0]) fail('a new run should field the first board consumers again')
  const fresh: Game = game
  if (fresh.minisEaten !== 0 || fresh.totalYou !== 0 || game.totalThem !== 0 || game.lawsDisabled !== 0) fail('a new run did not reset the tallies')
}

// Consumers roam and never clip walls or enter the house.
for (let level = 0; level < 3; level++) {
  const game = reachLevel(level)
  park(game)
  pinInWall(game)
  const starts = game.minis.map((mini) => `${mini.x},${mini.y}`)
  for (let i = 0; i < 240; i++) {
    park(game)
    pinInWall(game)
    update(game, 1 / 60, IDLE)
    if (mode(game) !== 'play') break
    for (const mini of game.minis) {
      if (!walkable(game.maze, mini.x, mini.y, 'player') || isHouse(game, mini.x, mini.y)) fail(`${mini.name} clipped a wall at ${mini.x},${mini.y}`)
      if (mini.progress > 0) {
        const next = ahead(game.maze, mini.x, mini.y, mini.dir)
        if (next && !walkable(game.maze, next.x, next.y, 'player')) fail(`${mini.name} clipping toward ${next.x},${next.y}`)
      }
    }
  }
  const moved = game.minis.filter((mini, i) => `${mini.x},${mini.y}` !== starts[i]).length
  if (moved < game.minis.length) fail(`level ${level}: only ${moved}/${game.minis.length} consumers roamed`)
  const speeds = game.minis.map((mini) => mini.speed)
  if (Math.max(...speeds) >= LEVELS[level]!.playerSpeed) fail(`level ${level} consumers are as fast as the player`)
}

console.log('playtest ok', {
  score: run.score,
  valuation: valuation(run.score),
  levels: LEVELS.map((level) => level.name),
  pacing,
})
