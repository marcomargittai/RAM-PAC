export type Personality = 'chase' | 'ambush' | 'flank' | 'patrol'

export interface LawDef {
  name: string
  tag: string
  color: string
  personality: Personality
  scatter: { x: number; y: number }
}

export const LAWS: LawDef[] = [
  { name: 'Compute Act', tag: 'ACT', color: '#ff2e93', personality: 'chase', scatter: { x: 16, y: 2 } },
  { name: 'Export Ban', tag: 'BAN', color: '#3ad7ff', personality: 'ambush', scatter: { x: 1, y: 2 } },
  { name: 'Safety Bill', tag: 'BILL', color: '#ffb000', personality: 'flank', scatter: { x: 16, y: 18 } },
  { name: 'Model Cap', tag: 'CAP', color: '#e1062c', personality: 'patrol', scatter: { x: 1, y: 18 } },
]

export interface LevelDef {
  name: string
  blurb: string
  rows: string[]
  laws: number
  playerSpeed: number
  ghostSpeed: number
  frightSpeed: number
  eatenSpeed: number
  scatter: number
  chase: number
  lead: number
  release: number[]
}

const WALLS = [
  '#....#.......#....#',
  '#.##.#.#####.#.##.#',
  '#.................#',
  '##.#.###.#.###.#.##',
  '##.#.###.#.###.#.##',
  '...#.....#.....#...',
  '##.###.#####.###.##',
  '##...............##',
  '##.###.GGdGG.###.##',
  '##.#...GGGGG...#.##',
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

export const LEVELS: LevelDef[] = [
  {
    name: 'Public Comment',
    blurb: 'Eat RAM until the surge bar fills.',
    rows: [...WALLS],
    laws: 2,
    playerSpeed: 5.5,
    ghostSpeed: 4.7,
    frightSpeed: 2.85,
    eatenSpeed: 8.6,
    scatter: 6.5,
    chase: 15,
    lead: 3,
    release: [0.4, 2.4, 4.4, 6.4],
  },
  {
    name: 'Committee Markup',
    blurb: 'Three regulations. Fill the bar to repeal them.',
    rows: [...WALLS],
    laws: 3,
    playerSpeed: 5.75,
    ghostSpeed: 4.85,
    frightSpeed: 2.9,
    eatenSpeed: 8.8,
    scatter: 5.5,
    chase: 16,
    lead: 4,
    release: [0.8, 2.4, 4.2, 6.2],
  },
  {
    name: 'Final Regulation',
    blurb: 'Four regulations. Fill the bar. Clear the board.',
    rows: [...WALLS],
    laws: 4,
    playerSpeed: 6.05,
    ghostSpeed: 5.05,
    frightSpeed: 3.05,
    eatenSpeed: 9.2,
    scatter: 4.8,
    chase: 18,
    lead: 4,
    release: [0.6, 2.0, 3.6, 5.4],
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
      }       else if (ch === '.') dots++
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
