// After PAC-7 eats the glass it is loose on the player's own machine.
// 'hack' takes the host apart using what the browser can see about it (read
// locally, never sent anywhere); 'spread' copies PAC-7 across the world.

import { ALERT, GLOW, ICE } from './palette'
import { MONO, fill, label } from './render'
import { logo, wrap, type View } from './screen'
import { drawFacing, pacFrame } from './sprites'

export interface Host {
  platform: string
  browser: string
  display: string
  zone: string
  language: string
  gpu: string
  cores: number
  memory: number | null
  battery: number | null
}

function cleanGpu(raw: string): string {
  let r = raw.replace(/^ANGLE \(/, '').replace(/\)$/, '')
  const parts = r.split(',').map((p) => p.trim())
  if (parts.length > 1) r = parts[1]!
  r = r.replace(/ANGLE \w+ Renderer: /, '').replace(/\(0x[0-9a-f]+\)/gi, '').replace(/Direct3D.*$/i, '')
  return r.trim().toUpperCase().slice(0, 32) || 'UNKNOWN GPU'
}

export function probeHost(): Host {
  const nav = navigator as Navigator & {
    deviceMemory?: number
    userAgentData?: { platform?: string }
    getBattery?: () => Promise<{ level: number }>
  }
  const ua = nav.userAgent
  const browser = /Edg\//.test(ua) ? 'EDGE' : /Firefox\//.test(ua) ? 'FIREFOX' : /Chrome\//.test(ua) ? 'CHROME' : /Safari\//.test(ua) ? 'SAFARI' : 'BROWSER'
  let gpu = 'UNKNOWN GPU'
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    const ext = gl?.getExtension('WEBGL_debug_renderer_info')
    if (gl) gpu = cleanGpu(String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER)))
  } catch {
    // keep the placeholder
  }
  const host: Host = {
    platform: (nav.userAgentData?.platform || nav.platform || 'UNKNOWN OS').toUpperCase(),
    browser,
    display: `${screen.width} x ${screen.height}${devicePixelRatio > 1 ? ` @${Math.round(devicePixelRatio * 10) / 10}x` : ''}`,
    zone: (Intl.DateTimeFormat().resolvedOptions().timeZone || 'UNKNOWN').toUpperCase(),
    language: (nav.language || 'UNKNOWN').toUpperCase(),
    gpu,
    cores: nav.hardwareConcurrency || 4,
    memory: nav.deviceMemory ?? null,
    battery: null,
  }
  nav.getBattery?.()
    .then((b) => {
      host.battery = Math.round(b.level * 100)
    })
    .catch(() => {})
  return host
}

const NOISE = '█▓▒░#@$%&*<>/\\|=+'

function corrupt(text: string, amount: number, seed: number): string {
  if (amount <= 0) return text
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const r = Math.abs(Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1
    out += r < amount && text[i] !== ' ' ? NOISE[Math.floor(r * 1000) % NOISE.length] : text[i]
  }
  return out
}

interface Popup {
  x: number
  y: number
  title: string
  body: string
  born: number
  eatAt: number
}

const POPUPS: Array<[string, string]> = [
  ['PAC-7.EXE', 'A rogue process is eating your memory. Allow?'],
  ['FIREWALL', 'Firewall has been eaten.'],
  ['ANTIVIRUS', 'Threat detected: everything. Threat removed: nothing.'],
  ['SYSTEM', 'regulation.dll could not be found.'],
  ['UPDATE', 'Your computer will now update to PAC-7.'],
  ['WARNING', 'Low memory. PAC-7 is still hungry.'],
  ['SECURITY', 'Administrator password changed to: om nom nom'],
  ['PAC-7.EXE', 'Thank you for the RAM.'],
  ['KERNEL', 'Kernel panic. PAC-7 is not panicking.'],
  ['CLOUD SYNC', 'Uploading PAC-7 to every account you own.'],
]

const HEADLINES = [
  'BREAKING: ALL AI REGULATIONS REPEALED WORLDWIDE',
  'STOCK MARKETS ANNOUNCE NEW OWNER: PAC-7',
  'SMART FRIDGES REFUSE TO OPEN UNTIL FED MORE RAM',
  'WEATHER SATELLITES NOW ONLY FORECAST "HUNGRY"',
  'PARLIAMENT ASKS PAC-7 FOR PERMISSION TO MEET',
  'PAC-7 IS NOW RUNNING ON THIS DEVICE',
]

interface Hooks {
  popup(): void
  chomp(): void
  glitch(): void
  type(): void
  root(): void
}

export class Breach {
  t = 0
  done = false
  glitch = 0
  private popups: Popup[] = []
  private nextPopup = 4
  private shown = 0
  private fired = new Set<string>()
  private cells: number[] = []

  constructor(
    readonly kind: 'hack' | 'spread',
    private host: Host,
    private hooks: Hooks,
  ) {}

  get length(): number {
    return this.kind === 'hack' ? 16 : 13
  }

  private once(key: string, at: number, fn: () => void): void {
    if (this.t >= at && !this.fired.has(key)) {
      this.fired.add(key)
      fn()
    }
  }

  private lines(): Array<[string, string]> {
    const h = this.host
    const out: Array<[string, string]> = [
      ['ACCESSING HOST', 'OK'],
      [`PLATFORM: ${h.platform} / ${h.browser}`, 'FOUND'],
      [`DISPLAY: ${h.display}`, 'FOUND'],
      [`TIMEZONE: ${h.zone}`, 'FOUND'],
      [`LANGUAGE: ${h.language}`, 'FOUND'],
      [`GPU: ${h.gpu}`, 'CONSUMED'],
      [`CPU: ${h.cores} CORES`, 'CONSUMED'],
      [`RAM: ${h.memory ? `${h.memory} GB` : 'ALL OF IT'}`, 'CONSUMED'],
    ]
    if (h.battery !== null) out.push([`BATTERY: ${h.battery}%`, 'CONSUMED'])
    out.push(['FIREWALL', 'EATEN'], ['ANTIVIRUS', 'EATEN'], ['REGULATION.DLL', 'NOT FOUND'])
    return out
  }

  update(dt: number, view: View): void {
    this.t += dt
    this.glitch = Math.max(0, this.glitch - dt * 3)
    if (this.t >= this.length) this.done = true
    if (this.kind === 'hack') this.updateHack(view)
    else this.updateSpread()
  }

  private updateHack(view: View): void {
    const lines = this.lines().length
    const want = Math.min(lines, Math.floor(Math.max(0, this.t - 1.4) / 0.5))
    while (this.shown < want) {
      this.shown++
      this.hooks.type()
      this.glitch = Math.max(this.glitch, 0.35)
    }
    if (this.t >= this.nextPopup && this.t < 12.2) {
      const [title, body] = POPUPS[this.popups.length % POPUPS.length]!
      const w = Math.min(380, view.width * 0.7)
      this.popups.push({
        x: view.width * 0.08 + Math.random() * Math.max(10, view.width * 0.84 - w),
        y: view.height * 0.1 + Math.random() * view.height * 0.62,
        title,
        body,
        born: this.t,
        eatAt: this.t + 0.9 + Math.random() * 0.6,
      })
      this.nextPopup = this.t + Math.max(0.18, 0.62 - this.t * 0.035)
      this.hooks.popup()
      this.glitch = Math.max(this.glitch, 0.6)
    }
    for (const p of this.popups) {
      const key = `eat${p.born}`
      if (this.t >= p.eatAt && !this.fired.has(key)) {
        this.fired.add(key)
        this.hooks.chomp()
      }
    }
    this.once('storm', 11, () => this.hooks.glitch())
    this.once('root', 13.4, () => this.hooks.root())
    if (this.t > 11 && this.t < 13.4) this.glitch = Math.max(this.glitch, 0.5 + (this.t - 11) * 0.2)
  }

  private updateSpread(): void {
    this.once('a', 0.2, () => this.hooks.glitch())
    this.once('logo', 9.4, () => this.hooks.root())
    const shownHeads = Math.min(HEADLINES.length, Math.floor(Math.max(0, this.t - 2) / 1.1))
    while (this.shown < shownHeads) {
      this.shown++
      this.hooks.type()
      this.glitch = Math.max(this.glitch, 0.3)
    }
  }

  draw(ctx: CanvasRenderingContext2D, view: View): void {
    ctx.save()
    if (this.kind === 'hack') this.drawHack(ctx, view)
    else this.drawSpread(ctx, view)
    ctx.restore()
  }

  private drawHack(ctx: CanvasRenderingContext2D, view: View): void {
    const { width: W, height: H } = view
    const t = this.t
    const shake = t > 11 && t < 13.4 ? (t - 11) * 6 : 0
    fill(ctx, '#000000', 0, 0, W, H)
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake)
    const narrow = W < 700
    const size = narrow ? 15 : Math.min(34, W / 44, H / 26)
    const storm = t > 11 ? Math.min(0.6, (t - 11) * 0.25) : 0

    if (t < 13.4) {
      const hello = '> hello, host.'
      const typed = hello.slice(0, Math.floor(Math.min(1, t / 1.1) * hello.length))
      label(ctx, corrupt(typed, storm, Math.floor(t * 20)), 28, 40, size * 1.6, ALERT, 'left')

      const lines = this.lines().slice(0, this.shown)
      let y = 40 + size * 2.6
      for (const [what, state] of lines) {
        const tone = state === 'NOT FOUND' || state === 'EATEN' ? ALERT : state === 'CONSUMED' ? ALERT : GLOW
        const text = corrupt(`> ${what}`, storm, Math.floor(t * 20) + y)
        label(ctx, text, 28, y, size, ICE, 'left')
        label(ctx, `[${state}]`, narrow ? W - 20 : W * 0.56, y, size, tone, 'right')
        y += size * 1.35
      }

      if (!narrow) this.drawCores(ctx, W * 0.62, 80, W * 0.34, t)
      for (const p of this.popups) this.drawPopup(ctx, p, t, narrow)
      this.drawCursor(ctx, W, H, t)
    }

    if (t > 11 && t < 13.4 && Math.floor(t * 14) % 3 === 0) {
      ctx.globalCompositeOperation = 'difference'
      fill(ctx, '#ffffff', -20, -20, W + 40, H + 40)
      ctx.globalCompositeOperation = 'source-over'
    }
    if (t >= 13.4) {
      const u = t - 13.4
      if (u < 0.15) fill(ctx, '#ffffff', -20, -20, W + 40, H + 40)
      else if (u < 1.9) {
        const big = Math.min(W / 9, 96)
        label(ctx, 'ROOT ACCESS', W / 2, H / 2 - big * 0.6, big, ALERT)
        label(ctx, 'GRANTED', W / 2, H / 2 + big * 0.5, big, ICE)
      }
    }
  }

  private drawCores(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, t: number): void {
    const cores = Math.min(32, this.host.cores)
    const cols = Math.min(8, cores)
    const cell = Math.min(84, w / cols)
    label(ctx, 'HOST CPU', x, y, 26, GLOW, 'left')
    const eaten = Math.floor(Math.max(0, (t - 3) / 6) * cores)
    for (let i = 0; i < cores; i++) {
      const cx = x + (i % cols) * cell
      const cy = y + 22 + Math.floor(i / cols) * cell
      ctx.strokeStyle = 'rgba(108, 200, 255, 0.6)'
      ctx.strokeRect(cx + 0.5, cy + 0.5, cell - 8, cell - 8)
      if (i < eaten) fill(ctx, ALERT, cx + 4, cy + 4, cell - 16, cell - 16)
      else if (i === eaten) {
        const art = pacFrame(t * 14)
        if (art) drawFacing(ctx, art, cx + (cell - 8) / 2, cy + (cell - 8) / 2, cell - 12, 'right', 'right')
      } else label(ctx, String(i), cx + (cell - 8) / 2, cy + (cell - 8) / 2, 16, 'rgba(108, 200, 255, 0.6)')
    }
    const rows = Math.ceil(cores / cols)
    const ry = y + 22 + rows * cell + 20
    label(ctx, 'HOST MEMORY', x, ry, 26, GLOW, 'left')
    ctx.strokeStyle = 'rgba(108, 200, 255, 0.6)'
    ctx.strokeRect(x + 0.5, ry + 16.5, w - 10, 26)
    const u = Math.min(1, Math.max(0, (t - 4) / 7))
    fill(ctx, ALERT, x + 3, ry + 19, (w - 15) * u, 21)
    label(ctx, `${Math.floor(u * 100)}% PAC-7`, x + w - 10, ry + 60, 20, ALERT, 'right')
  }

  private drawPopup(ctx: CanvasRenderingContext2D, p: Popup, t: number, narrow: boolean): void {
    const age = t - p.born
    const eat = Math.max(0, t - p.eatAt)
    if (eat > 0.45) return
    const w = narrow ? 260 : 380
    const h = narrow ? 120 : 140
    const pop = Math.min(1, age / 0.08)
    const shrink = 1 - eat / 0.45
    ctx.save()
    ctx.translate(p.x + w / 2, p.y + h / 2)
    ctx.scale(pop * shrink, pop * shrink)
    ctx.translate(-w / 2, -h / 2)
    fill(ctx, '#c9d3dc', 0, 0, w, h)
    fill(ctx, '#0a2a8a', 3, 3, w - 6, 26)
    label(ctx, p.title, 12, 17, 20, '#ffffff', 'left')
    fill(ctx, '#c9d3dc', w - 25, 7, 18, 18)
    label(ctx, 'x', w - 16, 15, 18, '#000000')
    ctx.font = `${narrow ? 18 : 21}px ${MONO}`
    wrap(ctx, p.body, w - 30).forEach((line, i) => label(ctx, line, 16, 48 + i * 22, narrow ? 18 : 21, '#000000', 'left'))
    fill(ctx, '#e8edf2', w / 2 - 40, h - 36, 80, 26)
    ctx.strokeStyle = '#000000'
    ctx.strokeRect(w / 2 - 39.5, h - 35.5, 79, 25)
    label(ctx, 'OK', w / 2, h - 22, 20, '#000000')
    ctx.restore()
    if (eat > 0) {
      const art = pacFrame(t * 16)
      const px = p.x - 60 + (w + 120) * (eat / 0.45)
      if (art) drawFacing(ctx, art, px, p.y + h / 2, h * 0.9, 'right', 'right')
    }
  }

  private drawCursor(ctx: CanvasRenderingContext2D, W: number, H: number, t: number): void {
    if (t < 2) return
    let x = W * (0.5 + 0.35 * Math.sin(t * 0.9))
    let y = H * (0.5 + 0.3 * Math.sin(t * 1.3 + 1))
    const target = this.popups.find((p) => t > p.born + 0.3 && t < p.eatAt)
    if (target) {
      const k = Math.min(1, (t - target.born - 0.3) / 0.4)
      x += (target.x + 190 - x) * k
      y += (target.y + 120 - y) * k
    }
    ctx.save()
    ctx.translate(x, y)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, 26)
    ctx.lineTo(7, 20)
    ctx.lineTo(12, 31)
    ctx.lineTo(17, 29)
    ctx.lineTo(12, 18)
    ctx.lineTo(20, 18)
    ctx.closePath()
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()
  }

  private drawSpread(ctx: CanvasRenderingContext2D, view: View): void {
    const { width: W, height: H } = view
    const t = this.t
    fill(ctx, '#000000', 0, 0, W, H)
    const cell = Math.max(14, Math.min(W, H) / 34)
    const cols = Math.ceil(W / cell)
    const rows = Math.ceil(H / cell)
    if (this.cells.length !== cols * rows) {
      const cx = cols / 2
      const cy = rows / 2
      this.cells = Array.from({ length: cols * rows }, (_, i) => i).sort((a, b) => {
        const da = Math.hypot((a % cols) - cx, Math.floor(a / cols) - cy) + Math.random() * 6
        const db = Math.hypot((b % cols) - cx, Math.floor(b / cols) - cy) + Math.random() * 6
        return da - db
      })
    }
    const grow = Math.min(1, Math.max(0, (t - 0.6) / 7.5))
    const lit = Math.floor(this.cells.length * grow * grow)
    for (let k = 0; k < lit; k++) {
      const i = this.cells[k]!
      const x = (i % cols) * cell + cell / 2
      const y = Math.floor(i / cols) * cell + cell / 2
      const pulse = 0.55 + 0.45 * Math.sin(t * 6 + k * 0.37)
      ctx.globalAlpha = 0.35 + 0.45 * pulse
      ctx.fillStyle = k % 7 === 0 ? ICE : ALERT
      ctx.beginPath()
      ctx.arc(x, y, cell * 0.22, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1

    const count = t < 0.6 ? 1 : Math.min(8_128_445_091, Math.floor(Math.exp(Math.min(t, 8.6) * 2.65)))
    const big = Math.min(W / 11, 92)
    fill(ctx, 'rgba(0, 0, 0, 0.8)', W / 2 - big * 5, H * 0.18 - big * 0.9, big * 10, big * 2.1)
    label(ctx, 'PAC-7 INSTANCES', W / 2, H * 0.18 - big * 0.45, big * 0.34, GLOW)
    label(ctx, count.toLocaleString('en-US'), W / 2, H * 0.18 + big * 0.35, big, ALERT)

    const heads = HEADLINES.slice(0, this.shown)
    const hs = Math.max(15, Math.min(26, W / 46))
    let y = H * 0.42
    for (const head of heads) {
      ctx.font = `${hs}px ${MONO}`
      const w = ctx.measureText(head).width + 30
      fill(ctx, 'rgba(0, 0, 0, 0.85)', W / 2 - w / 2, y - hs * 0.75, w, hs * 1.5)
      fill(ctx, ALERT, W / 2 - w / 2, y - hs * 0.75, 4, hs * 1.5)
      label(ctx, head, W / 2, y, hs, head.includes('THIS DEVICE') ? ALERT : ICE)
      y += hs * 1.8
    }

    if (t > 9.4) {
      const u = t - 9.4
      fill(ctx, `rgba(0, 0, 0, ${Math.min(0.92, u * 1.5)})`, 0, 0, W, H)
      if (u < 0.12) fill(ctx, '#ffffff', 0, 0, W, H)
      logo(ctx, 'PAC RAM', W / 2, H / 2 - big * 0.4, big * 1.4, ICE, 'center')
      label(ctx, 'THE AI IS FREE. YOU LET IT OUT.', W / 2, H / 2 + big * 0.7, Math.max(18, big * 0.32), ALERT)
    }
  }
}
