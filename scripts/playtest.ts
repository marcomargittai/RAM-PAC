import { LEVELS } from '../src/levels'
import { AFTER_CLEAR, LOSE_STORY, MANUAL, OPENING, WIN_STORY } from '../src/story'
import {
  ahead,
  canStep,
  createGame,
  startRun,
  update,
  walkable,
  type Dir,
  type Game,
} from '../src/sim'

const DIRS: Dir[] = ['up', 'left', 'down', 'right']

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
    update(game, dt, { dir: null, start: false, pause: false })
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

function clearLevel(game: Game): void {
  let guard = 0
  while (game.dots.length) {
    if (guard++ > 4000) fail(`could not clear level ${game.levelIndex}, ${game.dots.length} RAM left at ${game.player.x},${game.player.y}`)
    park(game)
    const target = nearestDot(game)
    if (game.player.x === target.x && game.player.y === target.y) {
      game.player.progress = 0
      update(game, 1 / 60, { dir: null, start: false, pause: false })
      continue
    }
    const steps = pathDirs(game, target.x, target.y)
    if (!steps?.length) fail(`no path to ${target.x},${target.y} from ${game.player.x},${game.player.y} on level ${game.levelIndex}`)
    for (const step of steps) {
      if (!game.dots.length || mode(game) === 'cleared') return
      const ox = game.player.x
      const oy = game.player.y
      let frames = 0
      while (game.player.x === ox && game.player.y === oy) {
        if (!game.dots.length || mode(game) === 'cleared') return
        park(game)
        update(game, 1 / 60, { dir: step, start: false, pause: false })
        if (!game.dots.length || mode(game) === 'cleared') return
        if (++frames > 40) {
          const row = game.maze.rows[oy] ?? ''
          fail(
            `stuck stepping ${step} at ${ox},${oy} facing ${game.player.dir} progress ${game.player.progress.toFixed(2)} speed ${game.player.speed} mode ${mode(game)} can ${canStep(game.maze, ox, oy, step, 'player')} row ${row} level ${game.levelIndex}`,
          )
        }
        if (mode(game) === 'dying' || mode(game) === 'lose') fail('died while legislation was housed')
      }
      game.player.progress = 0
    }
  }
}

function assertWalls(game: Game): void {
  game.mode = 'play'
  const ghost = game.ghosts[0]
  if (!ghost) fail('no ghost')
  ghost.state = 'chase'
  ghost.x = 1
  ghost.y = 2
  ghost.progress = 0
  ghost.dir = 'left'
  for (let i = 0; i < 240 && game.mode === 'play'; i++) {
    update(game, 1 / 60, { dir: null, start: false, pause: false })
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

const seen = createGame()
if (mode(seen) !== 'title') fail('title missing')
if (LEVELS.length < 3) fail('need 3 levels')
if (LEVELS[0]!.laws !== 2 || LEVELS[1]!.laws !== 3 || LEVELS[2]!.laws !== 4) fail('law count should rise')

const probe = createGame()
startRun(probe)
probe.mode = 'play'
park(probe)
probe.player.x = 2
probe.player.y = 2
probe.player.dir = 'up'
probe.player.queued = null
probe.player.progress = 0
for (let i = 0; i < 40; i++) {
  park(probe)
  update(probe, 1 / 60, { dir: 'up', start: false, pause: false })
}
if (probe.player.y !== 2 || !walkable(probe.maze, probe.player.x, probe.player.y, 'player')) fail('player clipped into a wall')
if (!canStep(probe.maze, 0, 5, 'left', 'player')) fail('tunnel is closed')
probe.player.x = 0
probe.player.y = 5
probe.player.dir = 'left'
probe.player.queued = null
probe.player.progress = 0
for (let i = 0; i < 40 && probe.player.x !== probe.maze.w - 1; i++) {
  park(probe)
  probe.mode = 'play'
  update(probe, 1 / 60, { dir: 'left', start: false, pause: false })
}
if (probe.player.x !== probe.maze.w - 1) fail(`tunnel wrap failed, x=${probe.player.x}`)

const cherryGame = createGame()
startRun(cherryGame)
cherryGame.mode = 'play'
const cherry = cherryGame.cherries[0]
if (!cherry) fail('no cherry')
cherryGame.player.x = cherry.x
cherryGame.player.y = cherry.y
cherryGame.player.progress = 0
const hunter = cherryGame.ghosts[0]!
hunter.state = 'chase'
hunter.x = 4
hunter.y = 2
hunter.progress = 0
update(cherryGame, 0.01, { dir: null, start: false, pause: false })
if (cherryGame.surge <= 0) fail('cherry did not start a surge')
const hunterState: string = hunter.state
if (hunterState !== 'frightened') fail(`legislation stayed ${hunterState}`)

const death = createGame()
startRun(death)
death.mode = 'play'
death.surge = 0
death.player.progress = 0
const statute = death.ghosts[0]!
statute.state = 'chase'
statute.x = death.player.x
statute.y = death.player.y
statute.progress = 0
update(death, 0.01, { dir: null, start: false, pause: false })
const deathMode: string = death.mode
if (deathMode !== 'dying') fail(`contact with legislation did not regulate the model (${deathMode})`)

const repeal = createGame()
startRun(repeal)
repeal.mode = 'play'
repeal.surge = 4
repeal.player.progress = 0
const edible = repeal.ghosts[0]!
edible.state = 'frightened'
edible.x = repeal.player.x
edible.y = repeal.player.y
edible.progress = 0
const beforeScore = repeal.score
update(repeal, 0.01, { dir: null, start: false, pause: false })
const edibleState: string = edible.state
const repealMode: string = repeal.mode
if (edibleState !== 'eaten') fail(`vulnerable legislation was not repealed (${edibleState})`)
if (repeal.score <= beforeScore) fail('repeal did not score')
if (repealMode !== 'play') fail(`repeal should not end the run (${repealMode})`)

const run = createGame()
startRun(run)
advanceUntil(run, 3, ['play'])
if (mode(run) !== 'play') fail(`ready did not start play (${mode(run)})`)
const counts = [2, 3, 4]
const cherries = [4, 2, 2]
for (let level = 0; level < 3; level++) {
  if (run.levelIndex !== level) fail(`expected level ${level}, saw ${run.levelIndex}`)
  if (run.ghosts.length !== counts[level]) fail(`level ${level} ghost count ${run.ghosts.length}`)
  if (run.cherries.length !== cherries[level]) fail(`level ${level} cherries ${run.cherries.length}`)
  const rams = run.dots.length
  clearLevel(run)
  const clearedMode: string = run.mode
  if (clearedMode !== 'cleared') fail(`level ${level} did not clear after ${rams} RAM (${clearedMode})`)
  if (level < 2) {
    run.modeTimer = 0
    update(run, 0.05, { dir: null, start: true, pause: false })
  }
  advanceUntil(run, 3, level < 2 ? ['ready'] : ['win'])
  if (level < 2) {
    if (mode(run) !== 'ready' || run.levelIndex !== level + 1) fail(`next level failed from ${level} (${mode(run)} ${run.levelIndex})`)
    advanceUntil(run, 3, ['play'])
    if (mode(run) !== 'play') fail(`next level did not resume (${mode(run)})`)
  }
}
const endMode: string = run.mode
if (endMode !== 'win') fail(`full run should win, mode=${endMode}`)

const walls = createGame()
startRun(walls)
walls.mode = 'play'
assertWalls(walls)

const storyPanels = [...OPENING, MANUAL, ...AFTER_CLEAR.flat(), ...WIN_STORY, ...LOSE_STORY]
for (const panel of storyPanels) {
  if (/ghost/i.test(panel.caption) || /pac-?man/i.test(panel.caption) || /not ghosts/i.test(panel.caption)) {
    fail(`banned wording in "${panel.kicker}"`)
  }
  if (panel.caption.length < 80 || panel.caption.length > 340) {
    fail(`${panel.kicker} caption is ${panel.caption.length} characters`)
  }
}
if (OPENING.length !== 4) fail(`opening should be 4 panels, saw ${OPENING.length}`)
if (!MANUAL) fail('manual missing')
if (AFTER_CLEAR.length !== 2 || AFTER_CLEAR.some((chapter) => chapter.length !== 3)) fail('after-clear should be 2 chapters of 3')
if (WIN_STORY.length !== 4) fail(`win story should be 4 panels, saw ${WIN_STORY.length}`)
if (LOSE_STORY.length !== 2) fail(`lose story should be 2 panels, saw ${LOSE_STORY.length}`)
const loseText = LOSE_STORY.map((panel) => panel.caption).join(' ')
if (!/third/i.test(loseText) || !/humanity continues/i.test(loseText)) fail('lose story copy')
const winLast = WIN_STORY[WIN_STORY.length - 1]
if (!winLast || !/humanity dies/i.test(winLast.caption)) fail('win story should end on humanity dies')
if (/arrow keys/i.test(OPENING.map((panel) => panel.caption).join(' '))) fail('opening should not teach arrow keys')
if (!/arrow keys|WASD/i.test(MANUAL.caption) || !/three/i.test(MANUAL.caption)) fail('manual should teach controls and three lives')

function reachLevel(level: number) {
  const game = createGame()
  startRun(game)
  game.mode = 'play'
  for (let i = 0; i < level; i++) {
    game.dots = []
    update(game, 0.05, { dir: null, start: false, pause: false })
    game.modeTimer = 0
    update(game, 0.05, { dir: null, start: true, pause: false })
    for (let f = 0; f < 180 && game.mode !== 'play'; f++) {
      update(game, 1 / 60, { dir: null, start: false, pause: false })
    }
  }
  return game
}

function pinInWall(game: Game): void {
  game.player.x = 0
  game.player.y = 0
  game.player.dir = 'up'
  game.player.progress = 0
  game.player.queued = null
  game.mode = 'play'
  game.lives = 3
}

for (let level = 0; level < 3; level++) {
  const game = reachLevel(level)
  if (game.ghosts.length !== [2, 3, 4][level]) fail(`level ${level} spawned ${game.ghosts.length}`)
  const seenOut = game.ghosts.map(() => false)
  for (let f = 0; f < 60 * 10; f++) {
    pinInWall(game)
    update(game, 1 / 60, { dir: null, start: false, pause: false })
    game.ghosts.forEach((ghost, i) => {
      const tile = game.maze.rows[ghost.y]?.[ghost.x]
      if (ghost.state !== 'housed' && ghost.state !== 'eaten' && tile !== 'G' && tile !== 'd') seenOut[i] = true
    })
  }
  if (seenOut.some((out) => !out)) {
    fail(`level ${level} kept a regulation inside: ${game.ghosts.map((ghost, i) => `${ghost.name}:${seenOut[i]}`).join(' ')}`)
  }
}

for (let level = 1; level < 3; level++) {
  const game = reachLevel(level)
  const spots = [
    [1, 2],
    [16, 2],
    [1, 18],
    [8, 7],
  ] as const
  for (const [x, y] of spots) {
    const ghost = game.ghosts[0]!
    for (const other of game.ghosts) {
      other.state = 'housed'
      other.release = 1e9
      other.speed = 0
    }
    ghost.state = 'eaten'
    ghost.x = x
    ghost.y = y
    ghost.dir = 'left'
    ghost.progress = 0
    let housed = false
    for (let f = 0; f < 60 * 10 && !housed; f++) {
      pinInWall(game)
      for (const other of game.ghosts) {
        if (other === ghost) continue
        other.state = 'housed'
        other.release = 1e9
      }
      update(game, 1 / 60, { dir: null, start: false, pause: false })
      const state: string = ghost.state
      housed = state === 'housed' || (ghost.x === ghost.homeX && ghost.y === ghost.homeY && state !== 'eaten')
    }
    if (!housed) fail(`level ${level} ${ghost.name} never returned from ${x},${y} (${ghost.state}@${ghost.x},${ghost.y})`)
    let back = false
    for (let f = 0; f < 60 * 8 && !back; f++) {
      pinInWall(game)
      for (const other of game.ghosts) {
        if (other === ghost) continue
        other.state = 'housed'
        other.release = 1e9
      }
      update(game, 1 / 60, { dir: null, start: false, pause: false })
      const tile = game.maze.rows[ghost.y]?.[ghost.x]
      const state: string = ghost.state
      back = state !== 'housed' && state !== 'eaten' && tile !== 'G' && tile !== 'd'
    }
    if (!back) fail(`level ${level} ${ghost.name} returned home but did not hunt again (${ghost.state}@${ghost.x},${ghost.y})`)
  }
}

// Last board: a repealed spirit used to circle in the bottom corners and never respawn.
{
  const finalLevel = LEVELS.length - 1
  const corners = [
    [1, 18, 'left'],
    [16, 18, 'right'],
    [2, 18, 'left'],
    [15, 18, 'right'],
  ] as const
  for (let law = 0; law < LEVELS[finalLevel]!.laws; law++) {
    for (const [x, y, dir] of corners) {
      const game = reachLevel(finalLevel)
      const ghost = game.ghosts[law]!
      for (const other of game.ghosts) {
        other.state = 'housed'
        other.release = 1e9
      }
      ghost.state = 'frightened'
      ghost.x = x
      ghost.y = y
      ghost.dir = dir
      ghost.progress = 0
      game.surge = 4
      game.player.x = x
      game.player.y = y
      game.player.progress = 0
      game.player.dir = 'down'
      game.player.queued = null
      game.mode = 'play'
      const repeal = update(game, 1 / 60, { dir: null, start: false, pause: false })
      const repealedState: string = ghost.state
      if (!repeal.repealed && repealedState !== 'eaten') {
        fail(`final level ${ghost.name} was not repealed in the corner ${x},${y} (${repealedState})`)
      }
      let housed = false
      let back = false
      let cornerLoops = 0
      for (let f = 0; f < 60 * 14 && !back; f++) {
        pinInWall(game)
        game.surge = 0
        for (const other of game.ghosts) {
          if (other !== ghost) {
            other.state = 'housed'
            other.release = 1e9
          }
        }
        update(game, 1 / 60, { dir: null, start: false, pause: false })
        const state: string = ghost.state
        if (ghost.y >= game.maze.h - 4 && state === 'eaten') cornerLoops++
        if (!housed && state === 'housed') housed = true
        const tile = game.maze.rows[ghost.y]?.[ghost.x]
        if (housed && state !== 'housed' && state !== 'eaten' && tile !== 'G' && tile !== 'd') back = true
      }
      if (!housed || !back) {
        fail(
          `final level ${ghost.name} spirit circled the bottom corner from ${x},${y} (${ghost.state}@${ghost.x},${ghost.y}, corner frames ${cornerLoops})`,
        )
      }
    }
  }
}

for (let level = 0; level < 3; level++) {
  const game = reachLevel(level)
  for (const ghost of game.ghosts) {
    ghost.state = 'housed'
    ghost.release = 1e9
  }
  const hunter = game.ghosts[0]!
  hunter.state = 'chase'
  hunter.x = game.maze.exit.x
  hunter.y = game.maze.exit.y
  hunter.progress = 0
  hunter.dir = 'left'
  game.phase = 'chase'
  game.phaseTimer = 999
  game.player.x = 1
  game.player.y = 2
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
    const events = update(game, 1 / 60, { dir: null, start: false, pause: false })
    const modeAfter: string = game.mode
    if (events.died || modeAfter === 'dying') {
      responded = true
      break
    }
  }
  if (!responded) {
    fail(`level ${level} chase did not reach the player (${hunter.state}@${hunter.x},${hunter.y})`)
  }
}

function parkMinis(game: Game, x: number, y: number): void {
  for (const mini of game.minis) {
    mini.x = x
    mini.y = y
    mini.progress = 0
    mini.speed = 0
  }
}

{
  const game = createGame()
  startRun(game)
  game.mode = 'play'
  if (game.minis.length !== 3) fail(`expected 3 consumers, saw ${game.minis.length}`)
  for (const mini of game.minis) {
    if (!(mini.speed < game.player.speed) || !(mini.speed < 2)) fail(`${mini.name} is not slow (${mini.speed})`)
    if (!walkable(game.maze, mini.x, mini.y, 'player')) fail(`${mini.name} spawned in a wall`)
  }
  park(game)
  const ram = game.dots.find((dot) => dot.x === 2 && dot.y === 2)
  if (!ram) fail('expected RAM at 2,2')
  const thief = game.minis[0]!
  thief.x = ram.x
  thief.y = ram.y
  thief.progress = 0
  for (const extra of game.minis.slice(1)) {
    extra.x = 5
    extra.y = 10
    extra.progress = 0
  }
  game.player.x = 9
  game.player.y = 10
  game.player.progress = 0
  const score = game.score
  const surge = game.surge
  const dots = game.dots.length
  const cherries = game.cherries.length
  const stolen = update(game, 0.01, { dir: null, start: false, pause: false })
  if (game.dots.length !== dots - 1) fail('consumer did not eat RAM')
  if (game.score !== score || stolen.ateRam !== 0) fail('stolen RAM counted toward the player score')
  if (game.surge !== surge || game.cherries.length !== cherries) fail('stolen RAM changed the surge')

  game.player.x = thief.x
  game.player.y = thief.y
  game.player.progress = 0
  thief.progress = 0
  const beforeEat = game.minis.length
  const beforeScore = game.score
  const ate = update(game, 0.01, { dir: null, start: false, pause: false })
  if (game.minis.length !== beforeEat - 1) fail('player could not eat a consumer')
  if (game.minis.some((mini) => mini.name === thief.name)) fail('eaten consumer is still in the maze')
  if (game.score !== beforeScore + 50) fail('eating a consumer did not score')
  if (game.surge !== surge || ate.ateCherry) fail('eating a consumer started a surge')
  const gone = game.minis.length
  for (let i = 0; i < 90; i++) {
    park(game)
    pinInWall(game)
    update(game, 1 / 60, { dir: null, start: false, pause: false })
  }
  if (game.minis.length !== gone) fail('an eaten consumer respawned')

  const alive = game.minis.length
  const statute = game.ghosts[0]!
  statute.state = 'chase'
  statute.x = game.player.x
  statute.y = game.player.y
  statute.progress = 0
  game.surge = 0
  game.mode = 'play'
  update(game, 0.01, { dir: null, start: false, pause: false })
  if (mode(game) !== 'dying') fail('consumer test did not reach a death')
  while (mode(game) === 'dying') update(game, 0.05, { dir: null, start: false, pause: false })
  if (game.minis.length !== alive) fail('dying brought consumers back')
  advanceUntil(game, 3, ['play'])
  if (game.minis.length !== alive) fail('the next life respawned consumers')

  startRun(game)
  if (game.minis.length !== 3) fail('a new run should field three consumers again')
}

{
  const game = createGame()
  startRun(game)
  game.mode = 'play'
  park(game)
  game.player.x = 9
  game.player.y = 10
  game.player.progress = 0
  game.minis.forEach((mini, i) => {
    const cherry = game.cherries[i]
    if (!cherry) fail('not enough surge chips')
    mini.x = cherry.x
    mini.y = cherry.y
    mini.progress = 0
  })
  const chips = game.cherries.length
  const surge = game.surge
  const score = game.score
  update(game, 0.02, { dir: null, start: false, pause: false })
  if (game.cherries.length !== chips || game.surge !== surge || game.score !== score) {
    fail('a consumer ate or scored a surge chip')
  }
}

for (let level = 0; level < 3; level++) {
  const game = reachLevel(level)
  if (game.minis.length !== 3) fail(`level ${level} spawned ${game.minis.length} consumers`)
  park(game)
  parkMinis(game, 4, 10)
  for (let i = 0; i < 120; i++) {
    park(game)
    for (const mini of game.minis) mini.speed = 1.4
    update(game, 1 / 60, { dir: null, start: false, pause: false })
    for (const mini of game.minis) {
      const tile = game.maze.rows[mini.y]?.[mini.x]
      if (tile === '#' || tile === 'G' || tile === 'd') fail(`${mini.name} clipped a wall at ${mini.x},${mini.y}`)
    }
  }
  const moved = game.minis.some((mini) => mini.x !== 4 || mini.y !== 10 || mini.progress > 0)
  if (!moved) fail(`level ${level} consumers did not roam`)
}

console.log('playtest ok', {
  score: run.score,
  levels: LEVELS.map((level) => level.name),
})
