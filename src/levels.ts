export type Personality = 'chase' | 'ambush' | 'flank' | 'patrol'

// The resistance: everyone who tries to slow an AI company down. Some of it is
// government, some of it is the public. The order matches the sprite files in
// src/sprites.ts.
export interface LawDef {
  name: string
  tag: string
  color: string
  personality: Personality
  // what happens to it when the company eats it during a lobbying surge
  beaten: string
  // one line for the briefing card
  about: string
}

export const LAWS: LawDef[] = [
  { name: 'Data Watchdog', tag: 'FINE', color: '#ffe14a', personality: 'chase', beaten: 'APPEALED', about: 'Privacy regulators. They block apps and hand out fines.' },
  { name: 'Local Residents', tag: 'PROTEST', color: '#38e0a8', personality: 'patrol', beaten: 'IGNORED', about: 'The people living next to your datacenters.' },
  { name: 'Copyright Lawsuit', tag: 'LAWSUIT', color: '#ff2e45', personality: 'ambush', beaten: 'SETTLED', about: 'Writers, artists and newspapers who want their work back.' },
  { name: 'AI Act', tag: 'AI ACT', color: '#b48cff', personality: 'flank', beaten: 'WATERED DOWN', about: 'Lawmakers writing rules for what AI may do.' },
  { name: 'Datacenter Moratorium', tag: 'BAN', color: '#ff5fd2', personality: 'chase', beaten: 'LIFTED', about: 'Towns and grids that say: no more datacenters here.' },
]

export interface MiniSpawn {
  x: number
  y: number
  dir: 'left' | 'right' | 'up' | 'down'
}

export interface LevelDef {
  // the era of AI this board stands for
  name: string
  years: string
  blurb: string
  // which build of the company you play as (sprite form 0..2)
  form: number
  company: string
  rows: string[]
  // indexes into LAWS
  laws: number[]
  playerSpeed: number
  ghostSpeed: number
  frightSpeed: number
  eatenSpeed: number
  scatter: number
  chase: number
  lead: number
  release: number[]
  minis: MiniSpawn[]
  miniSpeed: number
  // on the last board consumers are no longer safe from you
  minisEdible: boolean
}

// 15 x 15: the early days. A small market with RAM to spare.
const BOOM = [
  '#......#......#',
  '#.##.#.#.#.##.#',
  '#.............#',
  '#.##.##.##.##.#',
  '#....#...#....#',
  '####.#...#.####',
  '.....#GdG#.....',
  '####.#GGG#.####',
  '#....#####....#',
  '#.##.#.P.#.##.#',
  '#.............#',
  '#.##.#####.##.#',
  '#....#...#....#',
  '#.##...#...##.#',
  '#......#......#',
]

// 19 x 19: the build-out.
const BUILD = [
  '#....#.......#....#',
  '#.##.#.#####.#.##.#',
  '#.................#',
  '##.#.###.#.###.#.##',
  '##.#.###.#.###.#.##',
  '...#.....#.....#...',
  '##.###.#####.###.##',
  '##...............##',
  '##.###..GdG..###.##',
  '##.#....GGG....#.##',
  '.....#...P...#.....',
  '##.#####.#.#####.##',
  '##.......#.......##',
  '##.###.#####.###.##',
  '#.................#',
  '#.##.###.#.###.##.#',
  '#.##.#...#...#.##.#',
  '#.##.#.#####.#.##.#',
  '#.................#',
]

// 25 x 25: no one stopped it.
const SPRAWL = [
  '#...........#...........#',
  '#.###.#####.#.#####.###.#',
  '#.###.#####.#.#####.###.#',
  '#.......................#',
  '#.###.#.#########.#.###.#',
  '#.....#.....#.....#.....#',
  '#####.###.#.#.#.###.#####',
  '#####.#.....#.....#.#####',
  '#####.#.###.#.###.#.#####',
  '........#.......#........',
  '###.###.#.#...#.#.###.###',
  '..........#GdG#..........',
  '###.#####.#GGG#.#####.###',
  '###.......#####.......###',
  '###.#.#############.#.###',
  '#.....#...........#.....#',
  '#.###.#.###.#.###.#.###.#',
  '#...#.......P.......#...#',
  '###.#.#.#.#####.#.#.#.###',
  '#.....#.#...#...#.#.....#',
  '#.#####.###.#.###.#####.#',
  '#.......................#',
  '#.###.#.#########.#.###.#',
  '#.###.#.....#.....#.###.#',
  '#.....#.....#.....#.....#',
]

export const LEVELS: LevelDef[] = [
  {
    name: 'The Gold Rush',
    years: '2022 - 2023',
    blurb: 'A chatbot goes viral. Investors pour money in. Grab the RAM before anyone writes the rules.',
    form: 0,
    company: 'STARTUP',
    rows: [...BOOM],
    laws: [0, 1],
    playerSpeed: 5.2,
    ghostSpeed: 4.3,
    frightSpeed: 2.7,
    eatenSpeed: 8.4,
    scatter: 7,
    chase: 14,
    lead: 3,
    release: [0.6, 3.2],
    minis: [
      { x: 1, y: 0, dir: 'right' },
      { x: 13, y: 14, dir: 'left' },
      { x: 13, y: 2, dir: 'left' },
    ],
    miniSpeed: 3.7,
    minisEdible: false,
  },
  {
    name: 'The Build-Out',
    years: '2024 - 2026',
    blurb: 'Datacenters rise next to towns. The bills, the noise and the lawsuits arrive.',
    form: 1,
    company: 'HYPERSCALER',
    rows: [...BUILD],
    laws: [0, 1, 2, 3],
    playerSpeed: 5.9,
    ghostSpeed: 5.0,
    frightSpeed: 2.95,
    eatenSpeed: 9,
    scatter: 6,
    chase: 16,
    lead: 4,
    release: [0.6, 2.2, 3.8, 5.4],
    minis: [
      { x: 2, y: 5, dir: 'left' },
      { x: 16, y: 5, dir: 'right' },
      { x: 9, y: 14, dir: 'left' },
      { x: 9, y: 18, dir: 'right' },
    ],
    miniSpeed: 2.9,
    minisEdible: false,
  },
  {
    name: 'No One Stopped It',
    years: '2027 - ',
    blurb: 'All of the resistance at once. And the consumers are no longer off limits: eat them and take their RAM.',
    form: 2,
    company: 'CONGLOMERATE',
    rows: [...SPRAWL],
    laws: [0, 1, 2, 3, 4],
    playerSpeed: 6.6,
    ghostSpeed: 5.6,
    frightSpeed: 3.2,
    eatenSpeed: 9.6,
    scatter: 5,
    chase: 18,
    lead: 4,
    release: [0.5, 1.8, 3.1, 4.4, 5.7],
    minis: [
      { x: 1, y: 0, dir: 'right' },
      { x: 23, y: 0, dir: 'left' },
      { x: 1, y: 24, dir: 'right' },
      { x: 23, y: 24, dir: 'left' },
      { x: 5, y: 15, dir: 'down' },
      { x: 19, y: 15, dir: 'down' },
    ],
    miniSpeed: 2.1,
    minisEdible: true,
  },
]

const PLAYER_TILES = new Set(['.', 'P', ' '])

export function validateLevel(rows: string[]): void {
  const w = rows[0]?.length ?? 0
  if (!w || rows.some((row) => row.length !== w)) {
    throw new Error('Maze rows are not rectangular')
  }
  const h = rows.length
  let px = -1
  let py = -1
  let doorX = -1
  let doorY = -1
  let ghosts = 0
  let dots = 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y]![x]
      if (ch === 'P') {
        px = x
        py = y
      } else if (ch === 'G') ghosts++
      else if (ch === 'd') {
        doorX = x
        doorY = y
      } else if (ch === '.') dots++
      else if (ch !== '#' && ch !== ' ') {
        throw new Error(`Unknown tile "${ch}" at ${x},${y}`)
      }
    }
  }
  if (px < 0 || doorX < 0 || ghosts < 3 || dots < 1) {
    throw new Error('Maze is missing a start, door, RAM, or ghost house')
  }
  const exitY = doorY - 1
  if (exitY < 0 || !PLAYER_TILES.has(rows[exitY]![doorX]!)) {
    throw new Error('Ghost door has no exit')
  }
  const seen = Array.from({ length: h }, () => Array(w).fill(false))
  const queue: Array<[number, number]> = [[px, py]]
  seen[py]![px] = true
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
  while (queue.length) {
    const [x, y] = queue.shift()!
    for (const [dx, dy] of dirs) {
      let nx = x + dx!
      const ny = y + dy!
      if (nx < 0) nx = w - 1
      if (nx >= w) nx = 0
      if (ny < 0 || ny >= h || seen[ny]![nx]) continue
      if (!PLAYER_TILES.has(rows[ny]![nx]!)) continue
      seen[ny]![nx] = true
      queue.push([nx, ny])
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y]![x]!
      if (ch === '.' && !seen[y]![x]) {
        throw new Error(`Unreachable RAM at ${x},${y}`)
      }
    }
  }
}
