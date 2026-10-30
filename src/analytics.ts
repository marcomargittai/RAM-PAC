// Anonymous play analytics, sent to the same Supabase project as the board
// through the write-only track() function (supabase/analytics.sql). No
// cookies and no IP: one random id per visit, one per device to tell repeat
// visits apart. Events are batched and sent every few seconds and when the tab
// is hidden. Failures are dropped; the game never waits on this.

import { DEV } from './screen'
import { SUPABASE_ANON_KEY, SUPABASE_URL, online } from './online'

type Data = Record<string, string | number | boolean | null>
interface Pending {
  n: string
  t: number
  b?: number
  d?: Data
}

const uuid = (): string =>
  crypto.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => ((Math.random() * 16) | 0).toString(16))

const visit = uuid()
const born = performance.now()
let queue: Pending[] = []
let info: Record<string, unknown> | null = null
let sending = false

function visitor(): { id: string | null; repeat: boolean } {
  try {
    const old = localStorage.getItem('pacram.visitor')
    if (old) return { id: old, repeat: true }
    const id = uuid()
    localStorage.setItem('pacram.visitor', id)
    return { id, repeat: false }
  } catch {
    return { id: null, repeat: false }
  }
}

function device(): { device: string; os: string; browser: string } {
  const ua = navigator.userAgent
  const os = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
    ? 'ios'
    : /Android/.test(ua) ? 'android' : /Windows/.test(ua) ? 'windows' : /Mac OS X/.test(ua) ? 'mac' : /Linux/.test(ua) ? 'linux' : 'other'
  const touch = matchMedia('(pointer: coarse)').matches
  const small = Math.min(screen.width, screen.height) < 600
  const kind = touch ? (small ? 'phone' : 'tablet') : 'desktop'
  const browser = /Instagram/.test(ua) ? 'instagram' : /FBAN|FBAV/.test(ua) ? 'facebook' : /TikTok|musical_ly/.test(ua) ? 'tiktok'
    : /LinkedIn/.test(ua) ? 'linkedin' : /Edg\//.test(ua) ? 'edge' : /Firefox\//.test(ua) ? 'firefox'
      : /CriOS|Chrome\//.test(ua) ? 'chrome' : /Safari\//.test(ua) ? 'safari' : 'other'
  return { device: kind, os, browser }
}

function describe(): Record<string, unknown> {
  const q = new URLSearchParams(location.search)
  const who = visitor()
  let ref = ''
  try {
    const r = document.referrer ? new URL(document.referrer) : null
    if (r && r.host !== location.host) ref = r.host + r.pathname
  } catch { /* an unreadable referrer counts as direct */ }
  return {
    visitor: who.id,
    repeat: who.repeat,
    ...device(),
    lang: navigator.language,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen: `${screen.width}x${screen.height}`,
    referrer: ref,
    utm_source: q.get('utm_source') ?? q.get('ref') ?? '',
    utm_medium: q.get('utm_medium') ?? '',
    utm_campaign: q.get('utm_campaign') ?? '',
    challenge: q.has('c'),
    dev: DEV,
    host: location.host,
  }
}

/** Record one event. `board` is the zero-based board index when it matters. */
export function track(name: string, data?: Data, board?: number): void {
  if (!online) return
  const e: Pending = { n: name, t: Math.round((performance.now() - born) / 100) / 10 }
  if (board !== undefined) e.b = board
  if (data) e.d = data
  queue.push(e)
  if (queue.length > 200) queue = queue.slice(-200)
}

function flush(leaving = false): void {
  if (!online || sending || queue.length === 0) return
  info ??= describe()
  const batch = queue.slice(0, 60)
  queue = queue.slice(60)
  sending = !leaving
  void fetch(`${SUPABASE_URL}/rest/v1/rpc/track`, {
    method: 'POST',
    keepalive: leaving,
    headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_visit: visit, p_info: info, p_events: batch }),
  })
    .catch(() => {})
    .finally(() => {
      sending = false
    })
}

track('visit')
window.setTimeout(() => flush(), 1500)
window.setInterval(() => flush(), 10000)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    track('hidden')
    flush(true)
  }
})
window.addEventListener('pagehide', () => flush(true))
window.addEventListener('error', (e) => track('error', { msg: String(e.message).slice(0, 160) }))
