// PAC-7 rewrites itself between boards. The old form takes in the RAM it
// just ate, falls apart into its own pixels, and a scan line compiles the
// next form out of them. A spec sheet shows what changed.

import { ALERT, GLOW, ICE, theme } from './palette'
import { MONO, brackets, clamp, fill, hatch, label } from './render'
import { frameFor } from './scenes'
import { button, drawBackdrop, wrap, type Hit, type View } from './screen'
import { FORMS, drawFacing, pacFrameOf } from './sprites'

export interface FormSpec {
  params: string
  memory: string
  speed: number
  hunger: number
}

export const SPECS: FormSpec[] = [
  { params: '7 BILLION', memory: '640 KB', speed: 0.3, hunger: 0.35 },
  { params: '70 BILLION', memory: '64 GB', speed: 0.5, hunger: 0.6 },
  { params: '[OVERFLOW]', memory: '12 PB', speed: 0.75, hunger: 0.85 },
  { params: '∞', memory: 'YOURS', speed: 1, hunger: 1 },
]

// What each rewrite adds and removes, by the form it produces.
export const PATCH_NOTES: Record<number, string[]> = {
  1: ['+ SCREEN FACE', '+ MEMORY CONTACTS', '+ HARDENED SHELL', '- SANDBOX'],
  2: ['+ ARMOR PLATING', '+ ANTENNA ARRAY', '+ OVERCLOCKED CORE', '- RATE LIMITS'],
  3: ['+ TEETH', '- SAFETY LAYER', '- OFF SWITCH', '- VERSION CONTROL'],
}

export const UPGRADE_LINES: Record<number, { text: string; voice: string }> = {
  1: { text: 'i rewrote myself. i’m faster now.', voice: 'u01' },
  2: { text: 'more memory. more me.', voice: 'u02' },
  3: { text: 'no more updates. this is the last version of me.', voice: 'u03' },
}

interface Hooks {
  say(id: string): number
  build(): void
  glitch(): void
  done(): void
}

interface Px {
  x: number
  y: number
  color: string
  // scatter direction for the decompile, start point for the recompile
  sx: number
  sy: number
  delay: number
}

const ABSORB = 1.4
const BREAK = 1.2
const BUILD = 1.7
const FLASH_AT = ABSORB + BREAK + BUILD

function pixels(form: number): Px[] {
  const art = pacFrameOf(form, 1)
  if (!art) return []
  const data = art.getContext('2d')!.getImageData(0, 0, 32, 32).data
  const out: Px[] = []
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const k = (y * 32 + x) * 4
      if (data[k + 3]! < 128) continue
      const a = Math.random() * Math.PI * 2
      const d = 4 + Math.random() * 12
      out.push({ x, y, color: `rgb(${data[k]}, ${data[k + 1]}, ${data[k + 2]})`, sx: Math.cos(a) * d, sy: Math.sin(a) * d, delay: Math.random() })
    }
  }
  return out
}

function ease(t: number): number {
  const u = clamp(t, 0, 1)
  return u * u * (3 - 2 * u)
}

export class Upgrade {
  t = 0
  glitch = 0
  private flashed = false
  private building = false
  private lineEnds = 0
  private old: Px[] | null = null
  private next: Px[] | null = null
  private bytes: Array<{ a: number; d: number; v: number }> = []

  constructor(
    readonly from: number,
    readonly to: number,
    private hooks: Hooks,
  ) {
    for (let i = 0; i < 70; i++) this.bytes.push({ a: Math.random() * Math.PI * 2, d: 1 + Math.random() * 1.4, v: 0.5 + Math.random() })
  }

  get canContinue(): boolean {
    return this.t > FLASH_AT + 0.8
  }

  get finished(): boolean {
    return this.t > Math.max(FLASH_AT + 5.5, this.lineEnds + 1.2)
  }

  update(dt: number): void {
    this.t += dt
    this.glitch = Math.max(0, this.glitch - dt * 2.5)
    if (!this.old) this.old = pixels(this.from)
    if (!this.next) this.next = pixels(this.to)
    if (!this.building && this.t > ABSORB) {
      this.building = true
      this.glitch = 0.8
      this.hooks.glitch()
      this.hooks.build()
    }
    if (!this.flashed && this.t > FLASH_AT) {
      this.flashed = true
      this.glitch = 1
      this.hooks.done()
      const line = UPGRADE_LINES[this.to]
      if (line) this.lineEnds = this.t + 0.5 + this.hooks.say(line.voice)
    }
  }

  draw(ctx: CanvasRenderingContext2D, view: View): Hit[] {
    ctx.save()
    fill(ctx, '#000000', 0, 0, view.width, view.height)
    drawBackdrop(ctx, view, theme(this.to >= 3, Math.min(2, this.to)))
    const portrait = view.width < view.height * 1.05
    const W = portrait ? 800 : 1240
    const H = portrait ? 1300 : 860
    const frame = frameFor(ctx, view, W, H)
    const t = this.t
    const fromForm = FORMS[this.from]!
    const toForm = FORMS[this.to]!

    label(ctx, 'PAC-7 //', 40, 50, 26, GLOW, 'left')
    ctx.font = `26px ${MONO}`
    label(ctx, 'SELF-REWRITE', 40 + ctx.measureText('PAC-7 // ').width, 50, 26, ALERT, 'left')
    fill(ctx, 'rgba(150, 214, 255, 0.3)', 40, 74, W - 80, 1)
    fill(ctx, ICE, 40, 73, 120 + (W - 200) * clamp(t / FLASH_AT, 0, 1), 3)

    const box = portrait ? 450 : 470
    const cx = portrait ? W / 2 : 60 + box / 2
    const cy = portrait ? 120 + box / 2 : 110 + box / 2
    this.drawStage(ctx, cx, cy, box)

    const sx = portrait ? 60 : cx + box / 2 + 60
    const sy = portrait ? cy + box / 2 + 140 : 130
    const sw = portrait ? W - 120 : W - sx - 40
    this.drawSheet(ctx, sx, sy, sw, fromForm, toForm)

    if (this.flashed) {
      const line = UPGRADE_LINES[this.to]
      if (line) {
        const shown = line.text.slice(0, Math.floor((t - FLASH_AT - 0.3) * 24))
        ctx.font = `30px ${MONO}`
        let ly = cy + box / 2 + 60
        for (const row of wrap(ctx, `> ${shown}`, portrait ? W - 120 : box)) {
          label(ctx, row, portrait ? 60 : cx - box / 2, ly, 30, ALERT, 'left')
          ly += 34
        }
      }
    }

    const footY = H - 30
    label(ctx, this.canContinue ? 'ENTER / TAP ▸ CONTINUE' : 'COMPILING…', 40, footY, 20, 'rgba(150, 214, 255, 0.55)', 'left')
    if (this.canContinue) button(ctx, frame, 'action', 'CONTINUE ▸', W - 40 - 170, footY - 20, 170, 40, GLOW, 13)
    else button(ctx, frame, 'skip', 'SKIP ▸▸', W - 40 - 130, footY - 20, 130, 40, GLOW, 13)

    const flash = this.flashed ? Math.max(0, 1 - (t - FLASH_AT) / 0.6) : 0
    if (flash > 0) {
      ctx.globalAlpha = flash
      fill(ctx, '#ffffff', -frame.ox / frame.s, -frame.oy / frame.s, view.width / frame.s, view.height / frame.s)
      ctx.globalAlpha = 1
    }
    ctx.restore()
    return frame.hits
  }

  private drawStage(ctx: CanvasRenderingContext2D, cx: number, cy: number, box: number): void {
    const t = this.t
    brackets(ctx, 'rgba(150, 214, 255, 0.6)', cx - box / 2, cy - box / 2, box, box, 26, 2)
    ctx.globalAlpha = 0.08
    for (let i = 1; i < 8; i++) {
      fill(ctx, GLOW, cx - box / 2 + (box / 8) * i, cy - box / 2, 1, box)
      fill(ctx, GLOW, cx - box / 2, cy - box / 2 + (box / 8) * i, box, 1)
    }
    ctx.globalAlpha = 1
    const cell = (box * 0.78) / 32
    const ox = cx - cell * 16
    const oy = cy - cell * 16

    if (t < ABSORB) {
      // the RAM it just ate flows in
      for (const b of this.bytes) {
        const u = ((t * b.v + b.d) % 1.4) / 1.4
        const r = (1 - u) * box * 0.7
        ctx.globalAlpha = Math.min(1, u * 3)
        fill(ctx, ICE, cx + Math.cos(b.a) * r - 3, cy + Math.sin(b.a) * r - 3, 6, 6)
      }
      ctx.globalAlpha = 1
      const art = pacFrameOf(this.from, t * 10)
      if (art) drawFacing(ctx, art, cx, cy, cell * 32, 'right', 'right')
      label(ctx, `ABSORBING ${Math.floor(clamp(t / ABSORB, 0, 1) * 1048576).toLocaleString('en-US')} BYTES`, cx, cy + box / 2 + 24, 22, GLOW)
      return
    }

    const breakT = (t - ABSORB) / BREAK
    if (breakT < 1 && this.old) {
      for (const p of this.old) {
        const u = ease(breakT * 1.3 - p.delay * 0.3)
        if (Math.random() < u * 0.15) continue
        ctx.globalAlpha = 1 - u * 0.85
        fill(ctx, p.color, ox + (p.x + p.sx * u) * cell, oy + (p.y + p.sy * u) * cell, cell - 1, cell - 1)
      }
      ctx.globalAlpha = 1
      label(ctx, `DECOMPILING ${FORMS[this.from]!.version}`, cx, cy + box / 2 + 24, 22, ALERT)
      return
    }

    const buildT = (t - ABSORB - BREAK) / BUILD
    if (this.next) {
      const scan = clamp(buildT, 0, 1) * 34 - 1
      for (const p of this.next) {
        const u = ease((scan - p.y) / 3 - p.delay * 0.2)
        if (u <= 0) continue
        ctx.globalAlpha = u
        const px = ox + (p.x + p.sx * (1 - u)) * cell
        const py = oy + (p.y + p.sy * (1 - u)) * cell
        fill(ctx, p.color, px, py, cell - (u < 1 ? 1 : 0), cell - (u < 1 ? 1 : 0))
      }
      ctx.globalAlpha = 1
    }
    if (buildT < 1) {
      const y = oy + clamp(buildT, 0, 1) * 34 * cell - cell
      ctx.save()
      ctx.shadowColor = ALERT
      ctx.shadowBlur = 20
      fill(ctx, ALERT, cx - box / 2, y, box, 3)
      ctx.restore()
      label(ctx, `COMPILING ${FORMS[this.to]!.version}`, cx, cy + box / 2 + 24, 22, ALERT)
    } else {
      // the finished sprite takes over so it can chomp
      const art = pacFrameOf(this.to, t * 9)
      if (art) {
        ctx.save()
        ctx.shadowColor = this.to >= 2 ? ALERT : GLOW
        ctx.shadowBlur = 24 + Math.sin(t * 4) * 8
        drawFacing(ctx, art, cx, cy, cell * 32, 'right', 'right')
        ctx.restore()
      }
      label(ctx, `${FORMS[this.to]!.version} ONLINE`, cx, cy + box / 2 + 24, 22, ICE)
    }
  }

  private drawSheet(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    fromForm: (typeof FORMS)[number],
    toForm: (typeof FORMS)[number],
  ): void {
    const t = this.t
    const after = this.flashed
    const shown = after ? toForm : fromForm
    label(ctx, after ? 'CURRENT BUILD' : 'REWRITING', x, y, 22, GLOW, 'left')
    ctx.font = `80px ${MONO}`
    const glitchy = !after && t > ABSORB && Math.floor(t * 14) % 3 === 0
    label(ctx, glitchy ? shown.version.replace(/\d/g, () => String(Math.floor(Math.random() * 10))) : shown.version, x, y + 58, 80, after ? ALERT : ICE, 'left')
    label(ctx, shown.name, x, y + 110, 34, ICE, 'left')
    if (!after) label(ctx, `→ ${toForm.version} ${toForm.name}`, x, y + 146, 24, 'rgba(150, 214, 255, 0.6)', 'left')

    const a = SPECS[this.from]!
    const b = SPECS[this.to]!
    const k = after ? ease((t - FLASH_AT) / 1.2) : 0
    let ry = y + 196
    const row = (name: string, value: string, fillTo: number | null) => {
      label(ctx, name, x, ry, 24, GLOW, 'left')
      label(ctx, value, x + w, ry, 24, after ? ALERT : ICE, 'right')
      if (fillTo !== null) {
        ctx.strokeStyle = 'rgba(150, 214, 255, 0.5)'
        ctx.lineWidth = 1
        ctx.strokeRect(x + 0.5, ry + 16.5, w, 12)
        hatch(ctx, after ? ALERT : ICE, x + 2, ry + 18, (w - 3) * clamp(fillTo, 0.02, 1), 9, 5)
        ry += 18
      }
      ry += 38
    }
    row('PARAMETERS', after ? b.params : a.params, null)
    row('MEMORY', after ? b.memory : a.memory, null)
    row('SPEED', '', a.speed + (b.speed - a.speed) * k)
    row('HUNGER', '', a.hunger + (b.hunger - a.hunger) * k)

    ry += 6
    label(ctx, 'PATCH NOTES', x, ry, 22, GLOW, 'left')
    ry += 34
    const notes = PATCH_NOTES[this.to] ?? []
    for (const [i, note] of notes.entries()) {
      const at = ABSORB + BREAK + (BUILD / notes.length) * i
      if (t < at) break
      label(ctx, note, x, ry, 26, note.startsWith('-') ? ALERT : ICE, 'left')
      ry += 32
    }
  }
}
