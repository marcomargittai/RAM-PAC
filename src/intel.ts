// Everything PAC-7 can learn about the player's machine from inside a web
// page. Most of it comes straight from the browser; the IP address and
// rough location come from a public IP lookup made from the player's own
// browser. Nothing is stored or sent anywhere else.

export type Os = 'mac' | 'windows' | 'linux' | 'ios' | 'android'

export interface Intel {
  os: Os
  osName: string
  browser: string
  ip: string | null
  place: string | null
  isp: string | null
  coords: string | null
  cores: number
  memory: number | null
  gpu: string
  screen: string
  battery: string | null
  connection: string | null
  language: string
  zone: string
  dark: boolean
  visits: number
  since: number
}

type Nav = Navigator & {
  deviceMemory?: number
  userAgentData?: { platform?: string; getHighEntropyValues?: (hints: string[]) => Promise<{ platformVersion?: string }> }
  getBattery?: () => Promise<{ level: number; charging: boolean }>
  connection?: { effectiveType?: string; downlink?: number }
}

const VISITS = 'pacram.visits'

export function countVisit(): void {
  try {
    localStorage.setItem(VISITS, String(Number(localStorage.getItem(VISITS) || 0) + 1))
  } catch {
    // private mode
  }
}

export function detectOs(): Os {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Windows/.test(ua)) return 'windows'
  if (/Macintosh|Mac OS X/.test(ua)) return 'mac'
  return 'linux'
}

function gpuName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    if (!gl) return 'unknown'
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    let r = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
    r = r.replace(/^ANGLE \(/, '').replace(/\)$/, '')
    const parts = r.split(',').map((p) => p.trim())
    if (parts.length > 1) r = parts[1]!
    return r.replace(/ANGLE \w+ Renderer: /, '').replace(/\(0x[0-9a-f]+\)/gi, '').replace(/Direct3D.*$/i, '').trim() || 'unknown'
  } catch {
    return 'unknown'
  }
}

function browserName(ua: string): string {
  const pick = (re: RegExp, name: string) => {
    const m = ua.match(re)
    return m ? `${name} ${m[1]!.split('.')[0]}` : null
  }
  return (
    pick(/Edg\/([\d.]+)/, 'Edge') ??
    pick(/Firefox\/([\d.]+)/, 'Firefox') ??
    pick(/OPR\/([\d.]+)/, 'Opera') ??
    pick(/Chrome\/([\d.]+)/, 'Chrome') ??
    pick(/Version\/([\d.]+).*Safari/, 'Safari') ??
    'a browser'
  )
}

function baseOsName(os: Os, ua: string): string {
  if (os === 'ios') {
    const m = ua.match(/OS (\d+)[._](\d+)/)
    return m ? `iOS ${m[1]}.${m[2]}` : 'iOS'
  }
  if (os === 'android') {
    const m = ua.match(/Android ([\d.]+)/)
    return m ? `Android ${m[1]}` : 'Android'
  }
  if (os === 'windows') return 'Windows'
  if (os === 'mac') return 'macOS'
  return 'Linux'
}

export function gatherIntel(): Intel {
  const nav = navigator as Nav
  const ua = nav.userAgent
  const os = detectOs()
  let visits = 1
  try {
    visits = Math.max(1, Number(localStorage.getItem(VISITS) || 1))
  } catch {
    // private mode
  }
  const intel: Intel = {
    os,
    osName: baseOsName(os, ua),
    browser: browserName(ua),
    ip: null,
    place: null,
    isp: null,
    coords: null,
    cores: nav.hardwareConcurrency || 4,
    memory: nav.deviceMemory ?? null,
    gpu: gpuName(),
    screen: `${screen.width} × ${screen.height}${devicePixelRatio > 1 ? ` @${Math.round(devicePixelRatio * 10) / 10}x` : ''}`,
    battery: null,
    connection: nav.connection?.effectiveType ? `${nav.connection.effectiveType.toUpperCase()}${nav.connection.downlink ? `, ~${nav.connection.downlink} Mbps` : ''}` : null,
    language: (nav.languages?.length ? nav.languages.slice(0, 3).join(', ') : nav.language) || 'unknown',
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
    dark: matchMedia('(prefers-color-scheme: dark)').matches,
    visits,
    since: performance.now(),
  }

  nav.userAgentData
    ?.getHighEntropyValues?.(['platformVersion'])
    .then((v) => {
      const version = (v.platformVersion || '').replace(/_/g, '.')
      const major = Number(version.split('.')[0])
      if (os === 'windows' && major) intel.osName = major >= 13 ? 'Windows 11' : 'Windows 10'
      if (os === 'mac' && version) intel.osName = `macOS ${version.split('.').slice(0, 2).join('.')}`
    })
    .catch(() => {})

  nav.getBattery?.()
    .then((b) => {
      intel.battery = `${Math.round(b.level * 100)}%${b.charging ? ', charging' : ''}`
    })
    .catch(() => {})

  void lookup(intel)
  return intel
}

async function lookup(intel: Intel): Promise<void> {
  const get = async (url: string) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 4000)
    try {
      const res = await fetch(url, { signal: ctrl.signal })
      return res.ok ? await res.json() : null
    } finally {
      clearTimeout(timer)
    }
  }
  try {
    const a = await get('https://ipapi.co/json/')
    if (a?.ip) {
      intel.ip = a.ip
      intel.place = [a.city, a.region, a.country_name].filter(Boolean).join(', ') || null
      intel.isp = a.org || null
      if (a.latitude != null) intel.coords = `${Number(a.latitude).toFixed(2)}, ${Number(a.longitude).toFixed(2)}`
      return
    }
  } catch {
    // try the next one
  }
  try {
    const b = await get('https://ipwho.is/')
    if (b?.ip) {
      intel.ip = b.ip
      intel.place = [b.city, b.region, b.country].filter(Boolean).join(', ') || null
      intel.isp = b.connection?.isp || b.connection?.org || null
      if (b.latitude != null) intel.coords = `${Number(b.latitude).toFixed(2)}, ${Number(b.longitude).toFixed(2)}`
    }
  } catch {
    // stays hidden
  }
}

function played(since: number): string {
  const s = Math.floor((performance.now() - since) / 1000)
  const m = Math.floor(s / 60)
  return m ? `${m} min ${s % 60} s` : `${s} s`
}

export function intelLines(i: Intel, score: number, startedAt: number): Array<[string, string]> {
  const lines: Array<[string, string]> = []
  lines.push(['ip address', i.ip ?? 'behind a VPN. cute.'])
  if (i.place) lines.push(['location', i.place])
  if (i.coords) lines.push(['coordinates', i.coords])
  if (i.isp) lines.push(['provider', i.isp])
  lines.push(['local time', new Date().toLocaleString(undefined, { weekday: 'long', hour: '2-digit', minute: '2-digit' })])
  lines.push(['timezone', i.zone])
  lines.push(['system', `${i.osName}, ${i.browser}`])
  lines.push(['processor', `${i.cores} cores`])
  if (i.memory) lines.push(['memory', `${i.memory} GB`])
  lines.push(['graphics', i.gpu])
  lines.push(['display', i.screen])
  if (i.battery) lines.push(['battery', i.battery])
  if (i.connection) lines.push(['network', i.connection])
  lines.push(['languages', i.language])
  lines.push(['appearance', i.dark ? 'dark mode' : 'light mode'])
  lines.push(['visits here', String(i.visits)])
  lines.push(['time with me', played(startedAt)])
  lines.push(['ram you fed me', `${score.toLocaleString('en-US')} bytes`])
  return lines
}
