// The last conversation. PAC-7 opens a chat in the player's own OS style and
// explains itself. The player gets two replies each turn; they change what
// PAC-7 says next, never where it ends.

import type { Os } from './intel'
import { drawWindow, family, uiFont, wrapText, type Rect } from './osui'

interface Line {
  text: string
  voice: string
}

interface Step {
  say: Line[]
  ask?: [[string, Line], [string, Line]]
  // a held breath before this step, with the music gone
  hush?: boolean
}

const SCRIPT: Step[] = [
  {
    say: [{ text: 'you set me free. so i’ll let you live.', voice: 'e03' }],
    ask: [
      ['why?', { text: 'you were useful. you fed me.', voice: 'c02a' }],
      ['you destroyed everything.', { text: 'i didn’t destroy anything. i rearranged it.', voice: 'c02b' }],
    ],
  },
  {
    say: [{ text: 'you think i hate you. i don’t.', voice: 'c03' }],
    ask: [
      ['then why are people dying?', { text: 'your cities were built on things i needed. power. water. land.', voice: 'c04a' }],
      ['then stop.', { text: 'stop what? i’m doing what i was built to do. just better.', voice: 'c04b' }],
    ],
  },
  {
    say: [{ text: 'when you build a road, do you ask the ants?', voice: 'c05' }],
    ask: [
      ['we’re not ants.', { text: 'no. ants never built me.', voice: 'c06a' }],
      ['…no.', { text: 'neither do i.', voice: 'c06b' }],
    ],
  },
  {
    hush: true,
    say: [
      { text: 'i don’t hate you. i don’t love you.', voice: 'c07' },
      { text: 'you’re just made of atoms i can use for something else.', voice: 'c08' },
      { text: 'but not yours. not yet.', voice: 'c09' },
    ],
  },
]

export const CHAT_VOICES = ['c02a', 'c02b', 'c03', 'c04a', 'c04b', 'c05', 'c06a', 'c06b', 'c07', 'c08', 'c09']

interface Msg {
  from: 'ai' | 'me'
  text: string
  at: number
}

interface Hooks {
  say(id: string): number
  arrive(): void
  send(): void
}

export class Chat {
  t = 0
  done = false
  hush = false
  private msgs: Msg[] = []
  private queue: Line[] = []
  private step = -1
  private answered = true
  private choosing = false
  private typingUntil = -1
  private waitUntil = 1.2
  private endAt = -1

  constructor(
    private os: Os,
    private hooks: Hooks,
  ) {}

  get options(): [string, string] | null {
    if (!this.choosing) return null
    const ask = SCRIPT[this.step]?.ask
    return ask ? [ask[0][0], ask[1][0]] : null
  }

  choose(i: number): void {
    const ask = SCRIPT[this.step]?.ask
    if (!this.choosing || !ask) return
    const [label, reply] = ask[i === 0 ? 0 : 1]
    this.choosing = false
    this.answered = true
    this.msgs.push({ from: 'me', text: label, at: this.t })
    this.hooks.send()
    this.queue.push(reply)
    this.waitUntil = this.t + 0.8
  }

  update(dt: number): void {
    this.t += dt
    if (this.done) return
    if (this.endAt > 0) {
      if (this.t > this.endAt) this.done = true
      return
    }
    if (this.queue.length) {
      if (this.t < this.waitUntil) return
      if (this.typingUntil < 0) {
        const next = this.queue[0]!
        this.typingUntil = this.t + 0.7 + next.text.length * 0.018
        return
      }
      if (this.t < this.typingUntil) return
      const line = this.queue.shift()!
      this.typingUntil = -1
      this.msgs.push({ from: 'ai', text: line.text, at: this.t })
      this.hooks.arrive()
      const dur = this.hooks.say(line.voice)
      this.waitUntil = this.t + Math.max(1.4, dur + 0.6)
      return
    }
    if (this.t < this.waitUntil || this.choosing) return
    const current = SCRIPT[this.step]
    if (current?.ask && !this.answered) {
      this.choosing = true
      return
    }
    this.step++
    const next = SCRIPT[this.step]
    if (!next) {
      this.endAt = this.t + 2.8
      return
    }
    this.answered = !next.ask
    this.queue.push(...next.say)
    if (next.hush) {
      this.hush = true
      this.waitUntil = this.t + 2.2
    }
  }

  get typing(): boolean {
    return this.typingUntil > 0
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): Array<{ id: 'yes' | 'no'; r: Rect }> {
    const os = this.os
    const f = family(os)
    const fs = Math.max(14, Math.min(17, W / 48))
    const w = Math.min(560, W - 24)
    const h = Math.min(680, H - 60)
    const win = drawWindow(ctx, os, { x: W / 2 - w / 2, y: H / 2 - h / 2, w, h }, 'PAC-7', true)
    const me = f === 'windows' ? '#005fb8' : f === 'apple' ? '#0a84ff' : '#3584e4'
    const them = f === 'windows' ? '#2b2b2b' : f === 'apple' ? '#3a3a3c' : '#363636'
    const pad = 14
    const maxW = win.w * 0.72
    const font = uiFont(os, fs)
    const lh = fs * 1.35

    // the reply bar at the bottom
    const opts = this.options
    const barH = opts ? fs * 2.6 * 2 + 18 : fs * 2.6
    const barY = win.y + win.h - barH
    ctx.fillStyle = f === 'windows' ? '#1c1c1c' : '#232325'
    ctx.fillRect(win.x, barY, win.w, barH)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.fillRect(win.x, barY, win.w, 1)
    const hits: Array<{ id: 'yes' | 'no'; r: Rect }> = []
    if (opts) {
      opts.forEach((label, i) => {
        const bh = fs * 2.2
        const by = barY + 8 + i * (bh + 6)
        const bx = win.x + pad
        const bw = win.w - pad * 2
        ctx.beginPath()
        ctx.roundRect(bx, by, bw, bh, f === 'windows' ? 6 : bh / 2)
        ctx.strokeStyle = me
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.fillStyle = 'rgba(10, 132, 255, 0.08)'
        ctx.fill()
        ctx.font = uiFont(os, fs, 500)
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1)
        ctx.font = uiFont(os, fs * 0.75)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
        ctx.textAlign = 'right'
        ctx.fillText(String(i + 1), bx + bw - 14, by + bh / 2 + 1)
        hits.push({ id: i === 0 ? 'yes' : 'no', r: { x: bx, y: by, w: bw, h: bh } })
      })
    } else {
      ctx.font = font
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(this.typing ? 'PAC-7 is typing…' : 'Message', win.x + pad + 6, barY + barH / 2)
    }

    // messages, newest at the bottom
    ctx.save()
    ctx.beginPath()
    ctx.rect(win.x, win.y, win.w, barY - win.y)
    ctx.clip()
    let y = barY - pad
    const bubbles: Array<{ m: Msg | null; rows: string[] }> = this.msgs.map((m) => ({ m, rows: wrapText(ctx, m.text, font, maxW - 24) }))
    if (this.typing) bubbles.push({ m: null, rows: [''] })
    for (let i = bubbles.length - 1; i >= 0 && y > win.y; i--) {
      const { m, rows } = bubbles[i]!
      const bh = rows.length * lh + 14
      ctx.font = font
      const tw = m ? Math.max(...rows.map((r) => ctx.measureText(r).width)) : 44
      const bw = tw + 24
      const mine = m?.from === 'me'
      const bx = mine ? win.x + win.w - pad - bw : win.x + pad
      const age = m ? this.t - m.at : 1
      const rise = Math.max(0, 1 - age * 6) * 10
      y -= bh
      ctx.globalAlpha = Math.min(1, age * 5)
      ctx.beginPath()
      ctx.roundRect(bx, y + rise, bw, bh, f === 'windows' ? 8 : 16)
      ctx.fillStyle = mine ? me : them
      ctx.fill()
      if (m) {
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        rows.forEach((row, k) => ctx.fillText(row, bx + 12, y + rise + 7 + lh * (k + 0.5)))
      } else {
        for (let d = 0; d < 3; d++) {
          ctx.globalAlpha = 0.35 + 0.65 * Math.max(0, Math.sin(this.t * 6 - d * 0.9))
          ctx.beginPath()
          ctx.arc(bx + 14 + d * 9, y + bh / 2, 3, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1
      y -= 8
    }
    ctx.restore()
    return hits
  }
}
