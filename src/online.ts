// The global weekly board, on a free Supabase project. Until the two values
// below are filled in, the game only uses the board on this device.
//
// Setup (once, free, no card needed):
//   1. Create a project at supabase.com.
//   2. SQL editor: run supabase/setup.sql from this repo.
//   3. Project settings > API: copy the Project URL and the anon public key
//      into SUPABASE_URL and SUPABASE_ANON_KEY below. The anon key is meant to
//      be public; the database rules in setup.sql decide what it may do.

import type { Entry } from './leaderboard'
import { weekStart } from './leaderboard'

export const SUPABASE_URL = ''
export const SUPABASE_ANON_KEY = ''

export const online = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json', ...extra }
}

async function call(path: string, init: RequestInit): Promise<Response | null> {
  if (!online) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 6000)
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, signal: ctrl.signal })
    return res.ok ? res : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

interface Row {
  name: string
  score: number
  level: number
  escaped: boolean
  created_at: string
}

// This week's top scores worldwide, or null when offline or unreachable.
export async function fetchWeekly(limit = 50): Promise<Entry[] | null> {
  const since = encodeURIComponent(weekStart().toISOString())
  const res = await call(`scores?select=name,score,level,escaped,created_at&created_at=gte.${since}&order=score.desc,created_at.asc&limit=${limit}`, {
    method: 'GET',
    headers: headers(),
  })
  if (!res) return null
  try {
    const rows = (await res.json()) as Row[]
    return rows.map((r) => ({ name: r.name, score: r.score, level: r.level, escaped: r.escaped, at: Date.parse(r.created_at) }))
  } catch {
    return null
  }
}

export async function submit(entry: Entry): Promise<boolean> {
  const res = await call('scores', {
    method: 'POST',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify({ name: entry.name, score: entry.score, level: entry.level, escaped: entry.escaped }),
  })
  return res !== null
}
