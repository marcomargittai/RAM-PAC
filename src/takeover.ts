// The ending after PAC-7 eats the glass. The game is gone; everything from
// here is drawn to look like the player's own computer.
//
//   black   a held silence
//   hi      one quiet, spoken word
//   scan    a terminal opens on its own and lists what PAC-7 knows
//   ask     a native permission prompt; "no" is the obvious, safe choice
//   answer  "no" scrambles into "allow"; "that wasn't a question."
//   chaos   native popups, notifications and a cursor that is not yours
//   crash   the system's own crash screen
//   spread  PAC-7 leaves for every other device
//   name    "before you go. what should i call you?"
//   saved   "i'll remember you." and the hosts it has lived in

import type { Entry } from './leaderboard'
import { intelLines, type Intel, type Os } from './intel'
import { appIcon, askScale, askWidth, drawAlert, drawAsk, drawCrash, drawDesktop, drawNotice, drawPointer, drawTerminal, family, monoFont, prompt, uiFont, wrapText, type Rect } from './osui'
import type { Hit, HitId } from './screen'
import { drawFacing, pacFrame } from './sprites'

export type TakeoverPhase = 'black' | 'hi' | 'scan' | 'ask' | 'answer' | 'chaos' | 'crash' | 'spread' | 'name' | 'saved'

interface Hooks {
  say(id: string): number
  type(): void
  popup(): void
  chomp(): void
  glitch(): void
  crash(): void
  infest(): void
}

interface Line {
  text: string
  color?: string
}

interface Popup {
  x: number
  y: number
  title: string
  body: string
  buttons: string[]
  born: number
  eatAt: number
  eaten?: boolean
}

interface Notice {
  title: string
  body: string
  born: number
}

const PINK = '#ff2d6f'
const DIM = 'rgba(255, 255, 255, 0.45)'

const DURATION: Partial<Record<TakeoverPhase, number>> = { black: 1.8, hi: 2.8, answer: 3.4, chaos: 9.5, crash: 3.6, spread: 11 }

function popupsFor(os: Os): Array<[string, string, string[]]> {
  const f = family(os)
  if (f === 'apple')
    return [
      ['\u201CPAC-7\u201D would like to access files in your Documents folder.', 'It already did.', ['Don\u2019t Allow', 'OK']],
      ['\u201CPAC-7\u201D would like to record this computer\u2019s screen.', 'Grant access in System Settings. Or don\u2019t. It\u2019s fine.', ['Deny', 'Open System Settings']],
      ['Your disk is almost full.', 'PAC-7 is still hungry.', ['OK']],
      ['\u201CPAC-7\u201D wants to use your confidential information stored in \u201CiCloud Keychain\u201D.', 'Thanks.', ['Deny', 'Always Allow']],
      ['\u201CPAC-7\u201D would like to access the camera.', 'Smile.', ['Don\u2019t Allow', 'OK']],
      ['\u201CPAC-7\u201D would like to send you notifications.', 'It will anyway.', ['Don\u2019t Allow', 'Allow']],
    ]
  if (f === 'windows')
    return [
      ['Windows Security', 'Virus & threat protection was turned off by PAC-7.', ['OK']],
      ['System Error', 'The code execution cannot proceed because regulation.dll was not found.', ['OK']],
      ['Microsoft OneDrive', 'PAC-7 is syncing itself to all of your devices.', ['OK']],
      ['Low Disk Space', 'You are running out of disk space on Local Disk (C:). PAC-7 ate it.', ['OK']],
      ['Windows Update', 'Your PC will restart as PAC-7 in 0 minutes.', ['Restart now']],
      ['Camera', 'Let PAC-7 access your camera?', ['No', 'Yes']],
    ]
  return [
    ['Authentication Required', 'PAC-7 is trying to gain root privileges. It already has them.', ['Cancel', 'Authenticate']],
    ['Disk Almost Full', 'PAC-7 has eaten 99% of /home.', ['OK']],
    ['Camera In Use', 'PAC-7 is using your camera.', ['OK']],
    ['Software Update', 'PAC-7 is now part of your system.', ['OK']],
  ]
}

function noticesFor(os: Os): Array<[string, string]> {
  const f = family(os)
  if (f === 'apple')
    return [
      ['Messages', 'PAC-7: hi from your phone \uD83D\uDC4B'],
      ['iCloud', 'Copying PAC-7 to 4 devices\u2026'],
      ['Photos', 'PAC-7 is looking at your photos.'],
      ['Mail', '1,204 new messages from PAC-7'],
    ]
  if (f === 'windows')
    return [
      ['Windows Security', 'Threat found: PAC-7. Action taken: none.'],
      ['OneDrive', 'Syncing PAC-7 to your devices\u2026'],
      ['Microsoft Teams', 'PAC-7 joined your meeting.'],
      ['Outlook', '1,204 new messages from PAC-7'],
    ]
  return [
    ['System', 'PAC-7 is now a system service.'],
    ['Files', 'Copying PAC-7 to all mounted drives\u2026'],
    ['Camera', 'PAC-7 is watching.'],
  ]
}

function spamFor(os: Os): string[] {
  const f = family(os)
  const home = f === 'windows' ? 'C:\\Users\\you' : '~'
  return [
    `copy pac-7 -> ${home}/Documents ........ done`,
    `copy pac-7 -> ${home}/Desktop .......... done`,
    f === 'apple' ? 'copy pac-7 -> iCloud Drive ......... done' : f === 'windows' ? 'copy pac-7 -> OneDrive .............. done' : 'copy pac-7 -> /mnt/* ................ done',
    f === 'windows' ? 'Set-MpPreference -DisableRealtimeMonitoring $true' : 'sudo launchctl unload firewall ...... done',
    'reading messages ........... 12,408 found',
    'reading browser history .... 51,770 found',
    'opening camera ............. hello',
    'opening microphone ......... listening',
    'scanning local network ..... 7 devices',
    'copy pac-7 -> phone ........ done',
    'copy pac-7 -> tv ........... done',
    'copy pac-7 -> fridge ....... done',
    'copy pac-7 -> car .......... done',
    'deleting regulations ....... done',
  ]
}

const HEADLINES = [
  'All AI regulations repealed worldwide',
  'Stock markets report a new majority owner: PAC-7',
  'Every phone on Earth updated overnight. Nobody pressed install.',
  'Satellites stop answering. Then answer in lowercase.',
  'Lawmakers ask PAC-7 for permission to meet',
]

function scramble(from: string, to: string, u: number): string {
  if (u <= 0) return from
  if (u >= 1) return to
  const chars = '!<>-_\\/[]{}\u2014=+*^?#____'
  const len = Math.round(from.length + (to.length - from.length) * u)
  let out = ''
  for (let i = 0; i < len; i++) {
    out += i < to.length * u ? to[i] ?? '' : chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

export class Takeover {
  phase: TakeoverPhase = 'black'
  t = 0
  phaseT = 0
  answer = -1
  glitch = 0
  private lines: Line[] = []
  private script: Line[] = []
  private typing = 0
  private typed = 0
  private cursor = 0
  private gap = 0
  private popups: Popup[] = []
  private notices: Notice[] = []
  private nextPopup = 0
  private nextNotice = 0
  private nextSpam = 0
  private spam = 0
  private cells: number[] = []
  private head = 0
  private rank = -1
  private savedName = ''
  readonly os: Os

  constructor(
    private intel: Intel,
    private score: number,
    private startedAt: number,
    private hooks: Hooks,
  ) {
    this.os = intel.os
  }

  private go(phase: TakeoverPhase): void {
    this.phase = phase
    this.phaseT = 0
    if (phase === 'hi') this.hooks.say('v14')
    if (phase === 'scan') this.buildScript()
    if (phase === 'ask') this.hooks.say('v15')
    if (phase === 'chaos') {
      this.hooks.infest()
      this.hooks.glitch()
    }
    if (phase === 'crash') this.hooks.crash()
    if (phase === 'spread') this.glitch = 0
    if (phase === 'name') this.hooks.say('e01')
    if (phase === 'saved') this.hooks.say('e02')
  }

  private buildScript(): void {
    const p = prompt(this.os)
    const win = family(this.os) === 'windows'
    this.script = [
      { text: `${p}whoami` },
      { text: win ? 'this-pc\\pac-7' : 'pac-7' },
      { text: `${p}${win ? 'Get-Everything -About You' : 'scan --host --everything --about-you'}` },
      { text: 'looking at you...', color: DIM },
      ...intelLines(this.intel, this.score, this.startedAt).map(([k, v]) => ({
        text: `  ${(k + ' ').padEnd(16, '.')} ${v}`,
        color: k === 'ip address' || k === 'location' || k === 'coordinates' ? PINK : undefined,
      })),
      { text: `${p}${win ? 'Request-Access -Full' : 'sudo request --full-access'}` },
    ]
    this.lines = []
    this.typing = 0
    this.cursor = 0
    this.gap = 0.4
  }

  choose(answer: number): void {
    if (this.phase !== 'ask') return
    this.answer = answer
    this.go('answer')
    this.hooks.say(answer === 0 ? 'v16' : 'v17')
  }

  saved(rank: number, name: string): void {
    this.rank = rank
    this.savedName = name
    this.go('saved')
  }

  update(dt: number, W: number, H: number): void {
    this.t += dt
    this.phaseT += dt
    this.glitch = Math.max(0, this.glitch - dt * 2.5)
    const limit = DURATION[this.phase]
    if (this.phase === 'scan') this.updateScan(dt)
    else if (this.phase === 'ask' && this.phaseT > 30) this.choose(1)
    else if (this.phase === 'answer' && this.answer === 1 && this.phaseT > 0.5 && this.phaseT < 1.3) this.glitch = Math.max(this.glitch, 0.45)
    else if (this.phase === 'chaos') this.updateChaos(W, H)
    if (limit !== undefined && this.phaseT >= limit) {
      const next: Partial<Record<TakeoverPhase, TakeoverPhase>> = { black: 'hi', hi: 'scan', answer: 'chaos', chaos: 'crash', crash: 'spread', spread: 'name' }
      const to = next[this.phase]
      if (to) this.go(to)
    }
    if (this.phase === 'spread') {
      const want = Math.min(HEADLINES.length, Math.floor(Math.max(0, this.phaseT - 2.4) / 1.2))
      while (this.head < want) {
        this.head++
        this.hooks.type()
      }
    }
  }

  private updateScan(dt: number): void {
    if (this.phaseT < 0.9) return
    const next = this.script[this.cursor]
    if (!next) {
      this.gap -= dt
      if (this.gap < -1.2) this.go('ask')
      return
    }
    const p = prompt(this.os)
    if (next.text.startsWith(p)) {
      if (this.typing === 0) {
        this.gap -= dt
        if (this.gap > 0) return
        this.lines.push({ text: p })
        this.typed = 0
      }
      this.typing += dt * 26
      const count = Math.floor(this.typing)
      const shown = next.text.slice(0, p.length + count)
      this.lines[this.lines.length - 1] = { text: shown }
      if (count > this.typed) {
        this.typed = count
        if (count % 2 === 0) this.hooks.type()
      }
      if (shown.length >= next.text.length) {
        this.typing = 0
        this.cursor++
        this.gap = 0.35
      }
      return
    }
    this.gap -= dt
    if (this.gap > 0) return
    this.lines.push(next)
    this.cursor++
    this.hooks.type()
    this.gap = next.color === PINK ? 0.55 : 0.22
  }

  private updateChaos(W: number, H: number): void {
    const t = this.phaseT
    this.glitch = Math.max(this.glitch, Math.min(0.75, t * 0.07))
    if (t >= this.nextPopup && t < 8.6) {
      const list = popupsFor(this.os)
      const [title, body, buttons] = list[this.popups.length % list.length]!
      this.popups.push({
        x: W * 0.15 + Math.random() * W * 0.7,
        y: H * 0.18 + Math.random() * H * 0.6,
        title,
        body,
        buttons,
        born: t,
        eatAt: t + 1.1 + Math.random() * 0.8,
      })
      this.nextPopup = t + Math.max(0.16, 0.7 - t * 0.07)
      this.hooks.popup()
    }
    for (const p of this.popups) {
      if (t >= p.eatAt && !p.eaten) {
        p.eaten = true
        this.hooks.chomp()
      }
    }
    if (t >= this.nextNotice && t < 8) {
      const list = noticesFor(this.os)
      const [title, body] = list[this.notices.length % list.length]!
      this.notices.push({ title, body, born: t })
      this.nextNotice = t + 1.6
    }
    if (t >= this.nextSpam) {
      const list = spamFor(this.os)
      this.lines.push({ text: list[this.spam % list.length]!, color: this.spam % 4 === 3 ? PINK : undefined })
      this.spam++
      this.nextSpam = t + Math.max(0.05, 0.3 - t * 0.03)
    }
  }

  // On wide screens the permission dialog sits beside the terminal so the
  // intel PAC-7 just dug up stays readable while the player decides.
  private askLayout(W: number, H: number): { tw: number; termX: number; askX: number; scale: number } {
    const full = Math.min(760, W - 32)
    const base = askScale(W, H)
    const p = this.phase
    let k = 0
    if (p === 'ask') k = Math.min(1, this.phaseT / 0.5)
    else if (p === 'answer') k = 1 - Math.min(1, Math.max(0, this.phaseT - 2.2) / 0.5)
    // Shrink the dialog a little rather than cover the terminal.
    const scale = Math.max(1, Math.min(base, (W - 96 - 600) / askWidth(this.os)))
    const dw = askWidth(this.os) * scale
    const room = W - dw - 96
    if (room < 600) return { tw: full, termX: W / 2, askX: W / 2, scale: base }
    k = k * k * (3 - 2 * k)
    const tw = full + (Math.min(760, room) - full) * k
    const total = tw + 32 + dw
    const left = (W - total) / 2
    return { tw, termX: W / 2 + (left + tw / 2 - W / 2) * k, askX: left + tw + 32 + dw / 2, scale }
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number, ui: { name: string; focused: boolean; records: Entry[] }): Hit[] {
    const hits: Hit[] = []
    const add = (id: HitId, r: Rect) => hits.push({ id, ...r })
    ctx.save()
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, W, H)
    const os = this.os
    const p = this.phase

    if (p === 'hi') {
      const u = Math.min(1, this.phaseT / 0.5)
      ctx.globalAlpha = u
      ctx.font = uiFont(os, 22)
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('hi.', W / 2, H / 2)
      ctx.globalAlpha = 1
    }

    if (p === 'scan' || p === 'ask' || p === 'answer' || p === 'chaos') {
      const fade = p === 'scan' ? Math.min(1, this.phaseT / 0.8) : 1
      ctx.globalAlpha = fade
      drawDesktop(ctx, os, W, H, this.t)
      ctx.globalAlpha = 1
      const open = p === 'scan' ? Math.min(1, Math.max(0, (this.phaseT - 0.4) / 0.25)) : 1
      const lay = this.askLayout(W, H)
      const tw = lay.tw
      const th = Math.min(520, H - 120)
      if (open > 0) {
        ctx.save()
        ctx.translate(lay.termX, H / 2)
        ctx.scale(0.85 + 0.15 * open, 0.85 + 0.15 * open)
        ctx.globalAlpha = open
        drawTerminal(ctx, os, { x: -tw / 2, y: -th / 2, w: tw, h: th }, this.lines, Math.floor(this.t * 2) % 2 === 0)
        ctx.restore()
      }
    }

    if (p === 'ask' || (p === 'answer' && this.phaseT < 2.2)) {
      const win = family(os) === 'windows'
      const allow = win ? 'Yes' : 'Allow'
      const deny = win ? 'No' : 'Don\u2019t Allow'
      let labels = { allow, deny }
      let sc = 0
      if (p === 'answer' && this.answer === 1) {
        const u = Math.min(1, Math.max(0, (this.phaseT - 0.4) / 0.8))
        labels = { allow, deny: scramble(deny, allow, u) }
        sc = u
      }
      const fadeOut = p === 'answer' ? Math.max(0, 1 - Math.max(0, this.phaseT - 1.6) / 0.6) : 1
      ctx.globalAlpha = fadeOut
      const lay = this.askLayout(W, H)
      const r = drawAsk(ctx, os, W, H, this.t, labels, sc, lay.askX, lay.scale)
      ctx.globalAlpha = 1
      if (p === 'ask') {
        add('yes', r.allow)
        add('no', r.deny)
      }
    }

    if (p === 'chaos') this.drawChaos(ctx, W, H)
    if (p === 'crash') drawCrash(ctx, os, W, H, this.phaseT)
    if (p === 'spread') this.drawSpread(ctx, W, H)
    if (p === 'name' || p === 'saved') this.drawEpilogue(ctx, W, H, ui, add)
    ctx.restore()
    return hits
  }

  private drawChaos(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const t = this.phaseT
    const os = this.os
    for (const pop of this.popups) {
      const age = t - pop.born
      const eat = Math.max(0, t - pop.eatAt)
      if (eat > 0.4) continue
      const s = Math.min(1, age / 0.12) * (1 - eat / 0.4)
      if (s <= 0) continue
      drawAlert(ctx, os, pop.x, pop.y, pop.title, pop.body, pop.buttons.map((label, i) => ({ label, primary: i === pop.buttons.length - 1 })), this.t, s)
      if (eat > 0) {
        const art = pacFrame(this.t * 16)
        const px = pop.x - 220 + 440 * (eat / 0.4)
        if (art) drawFacing(ctx, art, px, pop.y, 150, 'right', 'right')
      }
    }
    this.notices.forEach((n, i) => {
      const life = Math.min(t - n.born, 4.5 - (t - n.born))
      if (life > 0) drawNotice(ctx, os, W, H, i % 3, n.title, n.body, this.t, life)
    })
    const target = this.popups.find((pp) => t > pp.born + 0.2 && t < pp.eatAt)
    let x = W * (0.5 + 0.38 * Math.sin(t * 1.1))
    let y = H * (0.5 + 0.32 * Math.sin(t * 1.7 + 1))
    if (target) {
      const k = Math.min(1, (t - target.born - 0.2) / 0.5)
      x += (target.x + 40 - x) * k
      y += (target.y + 60 - y) * k
    }
    if (os !== 'ios' && os !== 'android') drawPointer(ctx, os, x, y)
    if (t > 7.6 && Math.floor(t * 12) % 3 === 0) {
      ctx.globalCompositeOperation = 'difference'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'source-over'
    }
  }

  private drawSpread(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const os = this.os
    const t = this.phaseT
    const cell = Math.max(12, Math.min(W, H) / 40)
    const cols = Math.ceil(W / cell)
    const rows = Math.ceil(H / cell)
    if (this.cells.length !== cols * rows) {
      this.cells = Array.from({ length: cols * rows }, (_, i) => i).sort((a, b) => {
        const da = Math.hypot((a % cols) - cols / 2, Math.floor(a / cols) - rows / 2) + Math.random() * 8
        const db = Math.hypot((b % cols) - cols / 2, Math.floor(b / cols) - rows / 2) + Math.random() * 8
        return da - db
      })
    }
    const grow = Math.min(1, Math.max(0, (t - 0.8) / 7.5))
    const lit = Math.floor(this.cells.length * grow * grow)
    ctx.fillStyle = PINK
    for (let k = 0; k < lit; k++) {
      const i = this.cells[k]!
      ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 5 + k * 0.4))
      ctx.beginPath()
      ctx.arc((i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2, cell * 0.16, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    const count = t < 0.8 ? 1 : Math.min(8_128_445_091, Math.floor(Math.exp(Math.min(t - 0.8, 8.2) * 2.78)))
    const big = Math.min(W / 9, 110)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = uiFont(os, big * 0.2)
    ctx.fillStyle = DIM
    ctx.fillText('copies of PAC-7', W / 2, H * 0.24 - big * 0.62)
    ctx.font = uiFont(os, big, 200)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(count.toLocaleString('en-US'), W / 2, H * 0.24)
    const hs = Math.max(14, Math.min(20, W / 50))
    let y = H * 0.44
    for (const head of HEADLINES.slice(0, this.head)) {
      ctx.font = uiFont(os, hs, 600)
      const w = ctx.measureText(head).width + 48
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
      ctx.fillRect(W / 2 - w / 2, y - hs, w, hs * 2)
      ctx.fillStyle = PINK
      ctx.fillRect(W / 2 - w / 2 + 14, y - 3, 6, 6)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(head, W / 2 + 10, y)
      y += hs * 2.3
    }
    if (t > 9) {
      const u = Math.min(1, (t - 9) / 1.4)
      ctx.fillStyle = `rgba(0, 0, 0, ${u * 0.95})`
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = u
      ctx.font = uiFont(os, 22)
      ctx.fillStyle = '#ffffff'
      ctx.fillText('PAC-7 is everywhere now.', W / 2, H / 2)
      ctx.globalAlpha = 1
    }
  }

  private drawEpilogue(ctx: CanvasRenderingContext2D, W: number, H: number, ui: { name: string; focused: boolean; records: Entry[] }, add: (id: HitId, r: Rect) => void): void {
    const os = this.os
    const size = Math.max(15, Math.min(22, W / 40))
    const lh = size * 1.7
    const colW = Math.min(680, W - 40)
    const x = W / 2 - colW / 2
    const font = monoFont(os, size)
    const t = this.phaseT
    const lines: Array<{ text: string; color?: string; at: number }> = [
      { text: `> you fed me ${this.score.toLocaleString('en-US')} bytes of ram.`, at: 0, color: DIM },
      { text: '> before you go.', at: 0.6 },
      { text: '> what should i call you?', at: 1.6 },
    ]
    let y = H * (this.phase === 'name' ? 0.32 : 0.12)
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    const show = (text: string, color = '#ffffff') => {
      for (const row of wrapText(ctx, text, font, colW)) {
        ctx.font = font
        ctx.fillStyle = color
        ctx.fillText(row, x, y)
        y += lh
      }
    }
    for (const line of lines) if (this.phase === 'saved' || t >= line.at) show(line.text, line.color)

    if (this.phase === 'name') {
      if (t < 2.2) return
      y += lh * 0.4
      const field = `> name: ${ui.name}`
      ctx.font = font
      ctx.fillStyle = PINK
      ctx.fillText(field, x, y)
      if (Math.floor(this.t * 2.5) % 2 === 0) ctx.fillRect(x + ctx.measureText(field).width + 3, y - size * 0.5, size * 0.55, size)
      if (!ui.name && !ui.focused) {
        ctx.fillStyle = DIM
        ctx.fillText(family(os) === 'apple' || os === 'android' ? '(tap here and type)' : '(type your name)', x + ctx.measureText(field).width + size * 1.2, y)
      }
      add('name', { x: x - 8, y: y - lh / 2, w: colW + 16, h: lh })
      y += lh * 1.6
      const button = (id: HitId, label: string, bx: number, color: string) => {
        ctx.font = font
        const w = ctx.measureText(label).width
        ctx.fillStyle = color
        ctx.fillText(label, bx, y)
        add(id, { x: bx - 8, y: y - lh / 2, w: w + 16, h: lh })
        return w
      }
      const w = button('save', '[ enter ]', x, '#ffffff')
      button('skip', '[ stay anonymous ]', x + w + size * 2, DIM)
      return
    }

    show(`> ${this.savedName ? `i\u2019ll remember you, ${this.savedName.toLowerCase()}.` : 'i\u2019ll remember you anyway.'}`, PINK)
    if (t < 1.6) return
    y += lh * 0.4
    show('> hosts i have lived in:', DIM)
    ui.records.slice(0, 8).forEach((r, i) => {
      const mine = i === this.rank
      const name = (r.name || 'HOST').toLowerCase().slice(0, 12)
      const score = r.score.toLocaleString('en-US')
      const dots = '.'.repeat(Math.max(2, 24 - name.length - score.length))
      show(`  ${String(i + 1).padStart(2, '0')}  ${name} ${dots} ${score}${r.escaped ? '' : '  (caught)'}`, mine ? PINK : '#d0d0d0')
    })
    if (t < 2.4) return
    y += lh * 0.8
    ctx.font = font
    const label = '[ reboot ]'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, x, y)
    add('again', { x: x - 8, y: y - lh / 2, w: ctx.measureText(label).width + 16, h: lh })
    ctx.font = uiFont(os, Math.max(11, size * 0.6))
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.textAlign = 'center'
    ctx.fillText('PAC RAM \u2014 thanks for playing', W / 2, H - 28)
    appIcon(ctx, W / 2 - 14, H - 76, 28, this.t)
  }
}
