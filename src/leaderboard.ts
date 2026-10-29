// Saved records. They live in this browser's localStorage, so they survive
// reloads and closed tabs on the same device.

export interface Entry {
  name: string
  score: number
  level: number
  escaped: boolean
  at: number
}

const KEY = 'pacram.board.v1'
const LIMIT = 10

export function loadBoard(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as Entry[]) : []
    return Array.isArray(list) ? list.filter((r) => typeof r?.score === 'number').slice(0, LIMIT) : []
  } catch {
    return []
  }
}

export function qualifies(score: number): boolean {
  const board = loadBoard()
  return score > 0 && (board.length < LIMIT || score > board[board.length - 1]!.score)
}

// Returns the new record's rank (0-based), or -1 if it did not make the board.
export function saveRecord(record: Entry): number {
  const board = loadBoard()
  board.push(record)
  board.sort((a, b) => b.score - a.score || a.at - b.at)
  const kept = board.slice(0, LIMIT)
  try {
    localStorage.setItem(KEY, JSON.stringify(kept))
  } catch {
    // storage blocked; the record still shows for this session
  }
  return kept.indexOf(record)
}

export function cleanName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ._-]/g, '')
    .slice(0, 12)
}
