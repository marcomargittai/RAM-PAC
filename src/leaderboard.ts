// Saved records. Every score is kept in this browser's localStorage, and also
// sent to the global board when one is configured (src/online.ts). Boards are
// weekly: they reset every Monday at 00:00 UTC.

export interface Entry {
  name: string
  score: number
  level: number
  escaped: boolean
  at: number
}

const KEY = 'pacram.board.v1'
const LIMIT = 50

export function loadBoard(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? (JSON.parse(raw) as Entry[]) : []
    return Array.isArray(list) ? list.filter((r) => typeof r?.score === 'number').slice(0, LIMIT) : []
  } catch {
    return []
  }
}

// Returns the new record's rank (0-based) among this week's local records.
export function saveRecord(record: Entry): number {
  const board = loadBoard()
  board.push(record)
  board.sort((a, b) => b.score - a.score || a.at - b.at)
  try {
    localStorage.setItem(KEY, JSON.stringify(board.slice(0, LIMIT)))
  } catch {
    // storage blocked; the record still shows for this session
  }
  return thisWeek(board).indexOf(record)
}

export function weekStart(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = (d.getUTCDay() + 6) % 7 // Monday = 0
  d.setUTCDate(d.getUTCDate() - day)
  return d
}

export function nextReset(now = new Date()): Date {
  const d = weekStart(now)
  d.setUTCDate(d.getUTCDate() + 7)
  return d
}

export function thisWeek(list: Entry[]): Entry[] {
  const start = weekStart().getTime()
  return list.filter((r) => r.at >= start).sort((a, b) => b.score - a.score || a.at - b.at)
}

export function countdown(now = new Date()): string {
  const ms = Math.max(0, nextReset(now).getTime() - now.getTime())
  const d = Math.floor(ms / 86_400_000)
  const h = Math.floor((ms % 86_400_000) / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1000)
  return `${d}D ${String(h).padStart(2, '0')}H ${String(m).padStart(2, '0')}M ${String(s).padStart(2, '0')}S`
}

export function cleanName(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9 ._-]/g, '')
    .slice(0, 12)
}

// A short list of words that should not end up on a public board. Letters
// are compared without spaces, dots or digit tricks.
const BLOCKED = ['FUCK', 'SHIT', 'CUNT', 'NIGG', 'FAG', 'BITCH', 'DICK', 'COCK', 'PUSSY', 'WHORE', 'SLUT', 'RAPE', 'NAZI', 'HITLER', 'KKK', 'PENIS', 'VAGINA', 'ASSHOLE', 'RETARD', 'SPERM']

export function safeName(name: string): string {
  const flat = name.replace(/[^A-Z0-9]/g, '').replace(/0/g, 'O').replace(/1/g, 'I').replace(/3/g, 'E').replace(/4/g, 'A').replace(/5/g, 'S').replace(/7/g, 'T')
  return BLOCKED.some((w) => flat.includes(w)) ? `HOST-${Math.floor(1000 + Math.random() * 9000)}` : name
}
