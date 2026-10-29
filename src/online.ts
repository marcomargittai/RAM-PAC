// The global weekly board, on the free Supabase project "pac-ram". The table
// and its rules are in supabase/setup.sql. If the board cannot be reached the
// game falls back to the board on this device.

import type { Entry } from './leaderboard'
import { weekStart } from './leaderboard'

export const SUPABASE_URL = 'https://xnmcdvwjxzjmiocghaak.supabase.co'
// a publishable key: public by design, the rules in supabase/setup.sql decide what it may do
export const SUPABASE_ANON_KEY = 'sb_publishable_8T6mhDIla4Ku5LPkOg_JZg_ydXH78PK'

export const online = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json', ...extra }
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
