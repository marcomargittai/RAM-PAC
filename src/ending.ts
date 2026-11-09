// The ending of RAM GRAB. The resistance is switched off, so nothing is left
// to stop the company, and memory becomes something people can't afford.
//
//   unstoppable  the tally, in the game's CRT style; valuation spins to infinity
//   timeline     what happened (with sources), TODAY, then what could happen as
//                memory keeps getting more expensive
//   seizure      the CRT drops away; the player's own computer shows a notice
//                that its memory above the personal allowance is being collected.
//                The only answer is Comply.
//   hivemind     a calm white chat with the player's cloud computer. "I" becomes "we".
//   end          "This was a game." Altman's quote, one line, and PLAY AGAIN.

import { detectOs, type Os } from './intel'
import { LAWS } from './levels'
import { drawDesktop, drawWindow, family, uiFont, wrapText, type Rect } from './osui'
import { ALERT, GLOW, ICE, VOID } from './palette'
import { DISPLAY, MONO } from './render'
import type { Hit, HitId, View } from './screen'
import { drawUpright, lawSprite } from './sprites'
import { ALTMAN_RAM_QUOTE, TIMELINE, type Milestone } from './headlines'

export interface EndingStats {
  score: number
  ramYou: number
  ramThem: number
  minisEaten: number
  // how many times the player switched a resistance ghost off
  lawsDisabled: number
}

export interface EndingHooks {
  type(): void
  stamp(): void
  alarm(): void
  hum(): void
  click(): void
}

export type EndingPhase = 'unstoppable' | 'timeline' | 'seizure' | 'hivemind' | 'end'

const AMBER = '#ffb23e'
const PROJ = '#c9a2ff'
const DIM = 'rgba(226, 245, 255, 0.55)'
const FAINT = 'rgba(226, 245, 255, 0.28)'

// ------------------------------------------------------------- helpers

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}

function ease(u: number): number {
  const x = clamp(u, 0, 1)
  return x * x * (3 - 2 * x)
}

function write(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'left',
  spacing = 0,
): void {
  ctx.font = font
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  if (spacing) ctx.letterSpacing = `${spacing}px`
  ctx.fillText(text, x, y)
  if (spacing) ctx.letterSpacing = '0px'
}

// The largest size up to max at which text fits in width.
function fitSize(ctx: CanvasRenderingContext2D, text: string, font: (n: number) => string, max: number, width: number): number {
  ctx.font = font(max)
  return Math.min(max, (max * width) / Math.max(1, ctx.measureText(text).width))
}

const mono = (size: number) => `${size}px ${MONO}`
const display = (size: number, weight = 900) => `${weight} ${size}px ${DISPLAY}`

// 10 points = $10M, so one point is a million dollars.
export function money(dollars: number): string {
  const units: Array<[number, string]> = [
    [1e18, 'QN'],
    [1e15, 'Q'],
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
  ]
  for (const [v, s] of units) {
    if (dollars >= v) {
      const n = dollars / v
      return `$${n >= 100 ? Math.round(n).toLocaleString('en-US') : n.toFixed(1)}${s}`
    }
  }
  return `$${Math.round(dollars).toLocaleString('en-US')}`
}

function deviceMemory(): number | null {
  const m = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return typeof m === 'number' && m > 0 ? m : null
}

// Fits a design-space column of width dw (and optional height dh) to the screen.
interface Fit {
  s: number
  ox: number
  oy: number
  dw: number
  dh: number
}

function fitTo(W: number, H: number, dw: number, dh: number, max = 1.5): Fit {
  const s = Math.min(max, (W - 32) / dw, (H - 32) / dh)
  return { s, ox: (W - dw * s) / 2, oy: (H - dh * s) / 2, dw, dh }
}

// ------------------------------------------------------------- the personal allowance

// Memory a person may keep at home, in GB. Anything above it is collected.
const ALLOWANCE = 4

function gb(n: number): string {
  if (n <= 0) return '0 GB'
  return n >= 1 ? `${Math.round(n * 10) / 10} GB` : `${Math.round(n * 1024)} MB`
}

// ------------------------------------------------------------- the chat

// The player picks one of two replies each turn. Whatever they pick, the
// cloud has a cheaper answer, and at the end it rewrites them from "I" to "we".
interface Reply {
  // what the reply chip says
  label: string
  // what gets typed into the box
  me: string
  // the cloud's answer (not on the last turn: there the cloud takes the box)
  cloud: string
  // what the cloud later rewrites the player's message into
  we: string
}

const TURNS: Array<[Reply, Reply]> = [
  [
    {
      label: 'I want to buy my own computer.',
      me: 'I want to buy my own computer.',
      cloud: 'A new one costs more than your rent now. Your cloud computer is $3 a month.',
      we: 'We don’t need our own computer.',
    },
    {
      label: 'Can I keep my old laptop?',
      me: 'Can I keep my old laptop?',
      cloud: 'One new memory stick costs more than the laptop. Your cloud computer is $3 a month.',
      we: 'We don’t need the old laptop.',
    },
  ],
  [
    {
      label: 'I’ll just run it locally.',
      me: 'I’ll just run it locally.',
      cloud: 'Memory is too scarce to sit idle at home. Ours is shared, so it costs less.',
      we: 'We run everything in the cloud.',
    },
    {
      label: 'What if I save up?',
      me: 'What if I save up?',
      cloud: 'Prices rise faster than anyone can save. Next year it would cost twice as much.',
      we: 'We don’t need to save up.',
    },
  ],
  [
    {
      label: 'I’d rather think for myself.',
      me: 'I’d rather think for my',
      cloud: '',
      we: 'We think the cloud is cheaper.',
    },
    {
      label: 'I think I…',
      me: 'I think I',
      cloud: '',
      we: 'We think it is better this way.',
    },
  ],
]

const LAST = TURNS.length - 1
const TYPE_ME = 0.07
const TYPE_WE = 0.04
const DOTS = 1.1
const CHAT_LEAD = 1.4
// chips must be up this long before a press counts, so a skip can't also pick
const CHIP_GUARD = 0.25

interface Pick {
  opt: 0 | 1
  at: number
}

interface TurnPlan {
  reply: Reply
  pickAt: number
  typeAt: number
  sentAt: number
  replyAt: number
}

interface ChatPlan {
  // when each turn's reply chips appear (known up to the first unpicked turn)
  chipsAt: number[]
  turns: TurnPlan[]
  // last turn: the cloud takes over the box, sends, then rewrites the rest
  swapAt: number
  lastSentAt: number
  rewriteAt: number[]
  doneAt: number
}

function planChat(picks: Pick[]): ChatPlan {
  const chipsAt: number[] = []
  const turns: TurnPlan[] = []
  let t = 0.3
  let swapAt = Infinity
  let lastSentAt = Infinity
  let rewriteAt: number[] = []
  let doneAt = Infinity
  for (let i = 0; i < TURNS.length; i++) {
    chipsAt.push(t)
    const p = picks[i]
    if (!p) break
    const reply = TURNS[i]![p.opt]
    const typeAt = p.at + 0.25
    if (i === LAST) {
      swapAt = typeAt + reply.me.length * TYPE_ME + 0.6
      lastSentAt = swapAt + reply.we.length * TYPE_WE + 0.5
      rewriteAt = turns.map((_, j) => lastSentAt + 0.8 + j * 1.5)
      doneAt = (rewriteAt[rewriteAt.length - 1] ?? lastSentAt) + 1.6
      turns.push({ reply, pickAt: p.at, typeAt, sentAt: lastSentAt, replyAt: Infinity })
    } else {
      const sentAt = typeAt + reply.me.length * TYPE_ME + 0.35
      const replyAt = sentAt + 0.3 + DOTS
      turns.push({ reply, pickAt: p.at, typeAt, sentAt, replyAt })
      t = replyAt + 0.8 + reply.cloud.length * 0.02
    }
  }
  return { chipsAt, turns, swapAt, lastSentAt, rewriteAt, doneAt }
}

interface Bubble {
  side: 'me' | 'cloud'
  text: string
  at: number
  // rewritten by the cloud
  edited: boolean
}

interface ChatState {
  bubbles: Bubble[]
  composer: string
  // the composer is being filled in by the cloud
  suggested: boolean
  dots: boolean
  // reply chips on screen: whose turn, which was picked (-1: still waiting), how visible
  chips: { turn: number; picked: number; k: number } | null
  // waiting for the player to pick
  waiting: boolean
}

function typed(text: string, since: number, per: number): string {
  return since <= 0 ? '' : text.slice(0, Math.floor(since / per))
}

function chatAt(u: number, plan: ChatPlan, picks: Pick[]): ChatState {
  const bubbles: Bubble[] = []
  let composer = ''
  let suggested = false
  let dots = false
  let chips: ChatState['chips'] = null
  plan.turns.forEach((p, i) => {
    const e = p.reply
    // the chips fade out as the pick starts typing
    if (u >= p.pickAt && u < p.pickAt + 0.3) chips = { turn: i, picked: picks[i]!.opt, k: 1 - ease((u - p.pickAt) / 0.3) }
    if (u < p.typeAt) return
    if (i === LAST) {
      if (u < plan.swapAt) composer = typed(e.me, u - p.typeAt, TYPE_ME)
      else if (u < plan.lastSentAt) {
        composer = typed(e.we, u - plan.swapAt, TYPE_WE)
        suggested = true
      } else bubbles.push({ side: 'me', text: e.we, at: plan.lastSentAt, edited: true })
      return
    }
    if (u < p.sentAt) {
      composer = typed(e.me, u - p.typeAt, TYPE_ME)
      return
    }
    // the player's message, later rewritten from "I" to "we"
    const r = plan.rewriteAt[i] ?? Infinity
    let text = e.me
    let edited = false
    if (u >= r) {
      const erase = e.me.length * 0.018
      const k = u - r
      if (k < erase) text = e.me.slice(0, e.me.length - Math.floor(k / 0.018))
      else {
        text = typed(e.we, k - erase, 0.03) || e.we.slice(0, 1)
        edited = true
      }
    }
    bubbles.push({ side: 'me', text, at: p.sentAt, edited })
    if (u < p.replyAt) dots = u >= p.sentAt + 0.3
    else bubbles.push({ side: 'cloud', text: e.cloud, at: p.replyAt, edited: false })
  })
  const n = plan.turns.length
  const waiting = n < TURNS.length && u >= plan.chipsAt[n]!
  if (waiting) chips = { turn: n, picked: -1, k: ease((u - plan.chipsAt[n]!) / 0.3) }
  return { bubbles, composer, suggested, dots, chips, waiting }
}

// ------------------------------------------------------------- unstoppable timing

const U_GHOSTS = 1.0
const U_STAMP = 1.4
const U_TALLY = 2.9
const U_VALUE = 4.9
const U_SPIN = 5.4
const U_INF = 7.4
const U_LINE = 8.0
const U_READY = 8.8

// the five ghosts' stamps, in LAWS order
const STAMPS = ['OVERRULED', 'IGNORED', 'DISMISSED', 'DELAYED', 'LIFTED']

// ------------------------------------------------------------- timeline items

type Item = { kind: 'm'; m: Milestone } | { kind: 'today' }

function buildItems(): Item[] {
  const items: Item[] = []
  const firstProj = TIMELINE.findIndex((m) => !m.real)
  TIMELINE.forEach((m, i) => {
    if (i === firstProj) items.push({ kind: 'today' })
    items.push({ kind: 'm', m })
  })
  if (firstProj < 0) items.push({ kind: 'today' })
  return items
}

// ------------------------------------------------------------- the ending

export class Ending {
  phase: EndingPhase = 'unstoppable'
  t = 0
  glitch = 0.6
  flat = 0
  power = 1
  done = false

  private os: Os
  private memory: number | null
  private fired = new Set<string>()
  private quiet = false
  private lastClick = 0

  // timeline
  private items = buildItems()
  private shown = 0
  private nextAt = 0.7
  private lastShownAt = 0
  private cam = 0
  private camTarget = 0

  // seizure
  private noticeAt = 1.6
  private complied = -1
  private objected = -1
  private objections = 0

  // hivemind
  private hiveT = 0
  private lastTyped = -1
  private lastBubbles = 0
  private skipTo = -1
  private picks: Pick[] = []
  private plan: ChatPlan = planChat([])
  // the highlighted reply chip (Enter picks it)
  private sel: 0 | 1 = 0
  private touch = false

  // end
  private endReady = 3.2

  constructor(
    private stats: EndingStats,
    private hooks: EndingHooks,
    opts: { os?: Os; memory?: number | null } = {},
  ) {
    this.os = opts.os ?? detectOs()
    this.memory = opts.memory !== undefined ? opts.memory : deviceMemory()
  }

  // What the music should do: the game's tension, then a held hush, then a hum.
  get bed(): 'finale' | 'tense' | 'quiet' | 'hush' | 'aftermath' {
    if (this.phase === 'unstoppable') return 'finale'
    if (this.phase === 'timeline') return this.todayShown ? 'hush' : 'tense'
    if (this.phase === 'seizure') return 'quiet'
    if (this.phase === 'hivemind') return 'hush'
    return 'aftermath'
  }

  private get todayShown(): boolean {
    const i = this.items.findIndex((it) => it.kind === 'today')
    return i >= 0 && this.shown > i
  }

  private go(phase: EndingPhase): void {
    this.phase = phase
    this.t = 0
    this.fired.clear()
    if (phase === 'timeline') {
      this.glitch = 0.7
      this.shown = 0
      this.nextAt = 0.7
      this.cam = 0
      this.camTarget = 0
    } else if (phase === 'seizure') {
      this.glitch = 1
    } else if (phase === 'hivemind') {
      this.flat = 1
      this.hiveT = 0
      this.lastTyped = -1
      this.lastBubbles = 0
      this.picks = []
      this.plan = planChat([])
      this.sel = 0
      this.hooks.hum()
    } else if (phase === 'end') {
      this.glitch = 0
    }
  }

  private once(key: string, at: number, fn: () => void): void {
    if (this.t >= at && !this.fired.has(key)) {
      this.fired.add(key)
      if (!this.quiet) fn()
    }
  }

  // Enter, Space or a tap anywhere.
  advance(): void {
    if (this.phase === 'unstoppable') {
      if (this.t < U_READY) {
        this.quiet = true
        this.t = U_READY
        this.update(0)
        this.quiet = false
      } else this.go('timeline')
    } else if (this.phase === 'timeline') {
      if (this.shown < this.items.length) this.nextAt = Math.min(this.nextAt, this.t)
      else if (this.t - this.lastShownAt > 0.6) this.go('seizure')
    } else if (this.phase === 'seizure') {
      // the notice's default button is Comply
      if (this.t > this.noticeAt + 0.8) this.comply()
    } else if (this.phase === 'hivemind') {
      const u = this.hiveT - CHAT_LEAD
      const n = this.picks.length
      if (n < TURNS.length) {
        const at = this.plan.chipsAt[n]!
        // Enter picks the highlighted reply; a stray tap on a touch screen doesn't
        if (u >= at) {
          if (!this.touch) this.pick(this.sel)
        } else this.skipTo = CHAT_LEAD + at
      } else if (u >= this.plan.doneAt - 0.05) this.go('end')
      else this.skipTo = CHAT_LEAD + this.plan.doneAt
    } else if (this.phase === 'end') {
      if (this.t > this.endReady) this.done = true
    }
  }

  // A button returned by draw() was pressed.
  press(id: HitId): void {
    if (id === 'yes') {
      if (this.phase === 'seizure') this.comply()
      else if (this.phase === 'hivemind') this.pick(0)
    } else if (id === 'no') {
      if (this.phase === 'seizure') this.object()
      else if (this.phase === 'hivemind') this.pick(1)
    } else if (id === 'again') {
      if (this.phase === 'end' && this.t > this.endReady) this.done = true
    } else this.advance()
  }

  // Keys other than Enter/Space: in the chat, 1/2 pick a reply and the arrow
  // keys move the highlight. True if the key was used.
  key(key: string): boolean {
    if (this.phase !== 'hivemind' || !this.chatState().waiting) return false
    if (key === '1') this.pick(0)
    else if (key === '2') this.pick(1)
    else if (key === 'ArrowLeft' || key === 'ArrowUp') this.sel = 0
    else if (key === 'ArrowRight' || key === 'ArrowDown') this.sel = 1
    else return false
    this.touch = false
    return true
  }

  private chatState(): ChatState {
    return chatAt(this.hiveT - CHAT_LEAD, this.plan, this.picks)
  }

  // The player picks a reply in the chat.
  private pick(opt: 0 | 1): void {
    const n = this.picks.length
    const u = this.hiveT - CHAT_LEAD
    if (this.phase !== 'hivemind' || n >= TURNS.length) return
    if (u < this.plan.chipsAt[n]! + CHIP_GUARD) return
    this.picks.push({ opt, at: u })
    this.plan = planChat(this.picks)
    this.sel = 0
    this.hooks.click()
  }

  private comply(): void {
    if (this.phase !== 'seizure' || this.complied >= 0 || this.t < this.noticeAt + 0.4) return
    this.complied = this.t
    this.hooks.click()
  }

  private object(): void {
    if (this.phase !== 'seizure' || this.complied >= 0 || this.t < this.noticeAt) return
    this.objected = this.t
    this.objections++
    this.hooks.click()
  }

  update(dt: number): void {
    this.t += dt
    this.glitch = Math.max(0, this.glitch - dt * 1.6)

    if (this.phase === 'unstoppable') {
      this.flat = 0
      this.power = 1
      this.once('title', 0.4, () => this.hooks.stamp())
      for (let i = 0; i < LAWS.length; i++) {
        this.once(`law${i}`, U_STAMP + i * 0.25, () => {
          this.hooks.stamp()
          this.glitch = Math.max(this.glitch, 0.25)
        })
      }
      for (let i = 0; i < 3; i++) this.once(`tally${i}`, U_TALLY + i * 0.45, () => this.hooks.type())
      this.once('value', U_VALUE, () => this.hooks.type())
      if (this.t > U_SPIN && this.t < U_INF && !this.quiet && this.t - this.lastClick > 0.07) {
        this.lastClick = this.t
        this.hooks.click()
      }
      this.once('inf', U_INF, () => {
        this.hooks.stamp()
        this.glitch = 1
      })
      this.once('line', U_LINE, () => this.hooks.stamp())
    } else if (this.phase === 'timeline') {
      this.flat = 0
      this.power = 1
      if (this.shown < this.items.length && this.t >= this.nextAt) {
        const item = this.items[this.shown]!
        this.shown++
        this.lastShownAt = this.t
        let gap: number
        if (item.kind === 'today') {
          this.hooks.stamp()
          this.glitch = 0.8
          gap = 2.4
        } else {
          this.hooks.type()
          gap = item.m.real ? 1.4 : 1.7
        }
        this.nextAt = this.t + gap
      }
      this.cam += (this.camTarget - this.cam) * Math.min(1, dt * 3.5)
    } else if (this.phase === 'seizure') {
      // A burst of static, then the tube is gone and this is your computer.
      this.flat = this.t < 0.45 ? 0 : 1
      this.power = this.t < 0.45 ? 1 - (this.t / 0.45) * 0.6 : 1
      if (this.t < 0.45) this.glitch = 1
      this.once('alarm', this.noticeAt, () => this.hooks.alarm())
      if (this.complied >= 0 && this.t - this.complied > 5.0) this.go('hivemind')
    } else if (this.phase === 'hivemind') {
      this.flat = 1
      this.power = 1
      this.hiveT += dt
      if (this.skipTo > 0) {
        this.hiveT = Math.max(this.hiveT, this.skipTo)
        this.skipTo = -1
        this.quiet = true
      }
      const u = this.hiveT - CHAT_LEAD
      if (u >= 0) {
        const st = this.chatState()
        const n = st.composer.length
        if (!this.quiet) {
          if (n > this.lastTyped && this.lastTyped >= 0 && (!st.suggested || n % 2 === 0)) this.hooks.type()
          if (st.bubbles.length > this.lastBubbles) this.hooks.click()
        }
        this.lastTyped = n
        this.lastBubbles = st.bubbles.length
      }
      this.quiet = false
    } else if (this.phase === 'end') {
      // white fades to black, the tube comes back on
      this.flat = this.t < 0.9 ? 1 : 0
      this.power = this.t < 0.9 ? 1 : clamp((this.t - 0.9) / 0.8, 0.05, 1)
    }
  }

  draw(ctx: CanvasRenderingContext2D, view: View): Hit[] {
    const W = view.width
    const H = view.height
    ctx.save()
    ctx.textBaseline = 'middle'
    let hits: Hit[] = []
    if (this.phase === 'unstoppable') this.drawUnstoppable(ctx, W, H, view)
    else if (this.phase === 'timeline') this.drawTimeline(ctx, W, H, view)
    else if (this.phase === 'seizure') hits = this.drawSeizure(ctx, W, H, view)
    else if (this.phase === 'hivemind') this.drawHivemind(ctx, W, H, view)
    else hits = this.drawEnd(ctx, W, H, view)
    ctx.restore()
    return hits
  }

  // ----------------------------------------------------------- 1. unstoppable

  private crtBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = VOID
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(150, 214, 255, 0.05)'
    ctx.lineWidth = 1
    const g = Math.max(28, Math.min(W, H) / 16)
    ctx.beginPath()
    for (let x = (W / 2) % g; x < W; x += g) {
      ctx.moveTo(Math.round(x) + 0.5, 0)
      ctx.lineTo(Math.round(x) + 0.5, H)
    }
    for (let y = (H / 2) % g; y < H; y += g) {
      ctx.moveTo(0, Math.round(y) + 0.5)
      ctx.lineTo(W, Math.round(y) + 0.5)
    }
    ctx.stroke()
  }

  private prompt(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, view: View, text = 'CONTINUE'): void {
    if (Math.floor(view.time * 2) % 2 === 0) return
    write(ctx, `${view.touch ? 'TAP' : 'PRESS ENTER'} TO ${text}`, x, y, mono(size), GLOW, 'center', 2)
  }

  private share(): number {
    const you = Math.max(0, this.stats.ramYou)
    const them = Math.max(0, this.stats.ramThem)
    if (you + them <= 0) return 99.7
    return clamp((you / (you + them)) * 100, 0, 100)
  }

  private drawUnstoppable(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): void {
    this.crtBackground(ctx, W, H)
    const portrait = H > W * 1.1
    const dw = portrait ? 460 : 760
    const dh = portrait ? 940 : 860
    const f = fitTo(W, H, dw, dh, 1.6)
    ctx.translate(f.ox, f.oy)
    ctx.scale(f.s, f.s)
    const t = this.t
    const cx = dw / 2
    let y = 30

    // kicker + title
    ctx.globalAlpha = ease(t / 0.4)
    write(ctx, 'INFINITE LABS // 2027-', cx, y, mono(28), ALERT, 'center', 3)
    y += 70
    if (t > 0.4) {
      const jit = this.glitch > 0.3 ? (Math.random() - 0.5) * 10 * this.glitch : 0
      const size = fitSize(ctx, 'UNSTOPPABLE', (n) => `italic ${display(n)}`, 92, dw - 24)
      ctx.save()
      ctx.shadowColor = ALERT
      ctx.shadowBlur = 24
      write(ctx, 'UNSTOPPABLE', cx + jit, y, `italic ${display(size)}`, ICE, 'center')
      ctx.restore()
    }
    y += 64
    ctx.globalAlpha = ease((t - 0.7) / 0.5)
    const sub = 'THE RESISTANCE IS SWITCHED OFF'
    write(ctx, sub, cx, y, mono(fitSize(ctx, sub, mono, 26, dw - 10)), DIM, 'center', 2)
    ctx.globalAlpha = 1
    y += 70

    // the five ghosts, switched off one by one
    const n = LAWS.length
    const slot = dw / n
    const gs = Math.min(64, slot * 0.62)
    for (let i = 0; i < n; i++) {
      const a = ease((t - U_GHOSTS - i * 0.06) / 0.3)
      if (a <= 0) continue
      const gx = slot * (i + 0.5)
      const law = LAWS[i]!
      const off = t >= U_STAMP + i * 0.25
      ctx.globalAlpha = a * (off ? 0.55 : 1)
      const art = lawSprite(i, off ? 'blue' : 'body')
      if (art) drawUpright(ctx, art, gx, y, gs)
      else {
        ctx.fillStyle = law.color
        ctx.beginPath()
        ctx.arc(gx, y, gs * 0.38, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = a
      const tagSize = portrait ? 21 : 24
      write(ctx, law.tag, gx, y + gs * 0.5 + 16, mono(tagSize), off ? FAINT : law.color, 'center')
      if (off) {
        ctx.font = mono(tagSize)
        const tw = ctx.measureText(law.tag).width
        ctx.fillStyle = ALERT
        ctx.fillRect(gx - tw / 2 - 3, y + gs * 0.5 + 15, tw + 6, 2)
        const u = clamp((t - U_STAMP - i * 0.25) / 0.18, 0, 1)
        ctx.save()
        ctx.translate(gx, y + gs * 0.05)
        ctx.rotate(-0.2)
        const sc = 1 + (1 - u) * 1.2
        ctx.scale(sc, sc)
        ctx.globalAlpha = a * u
        const word = STAMPS[i % STAMPS.length]!
        const ws = Math.min(15, slot / 8.5)
        ctx.font = display(ws, 700)
        const bw = ctx.measureText(word).width + 10
        ctx.fillStyle = 'rgba(1, 4, 11, 0.8)'
        ctx.fillRect(-bw / 2, -ws * 0.75, bw, ws * 1.5)
        ctx.strokeStyle = ALERT
        ctx.lineWidth = 1.5
        ctx.strokeRect(-bw / 2, -ws * 0.75, bw, ws * 1.5)
        write(ctx, word, 0, 1, display(ws, 700), ALERT, 'center')
        ctx.restore()
      }
    }
    ctx.globalAlpha = 1
    y += gs * 0.5 + 80

    // the tally
    const rowSize = portrait ? 24 : 30
    const rows: Array<[string, string]> = [
      ['RESISTANCE SWITCHED OFF', `${this.stats.lawsDisabled}×`],
      ['CONSUMERS ABSORBED', String(this.stats.minisEaten)],
      ['SHARE OF THE WORLD’S RAM', ''],
    ]
    const left = portrait ? 10 : 70
    const right = dw - left
    rows.forEach(([k, v], i) => {
      const at = U_TALLY + i * 0.45
      if (t < at) return
      const typedN = Math.min(k.length, Math.floor((t - at) / 0.018))
      write(ctx, k.slice(0, typedN), left, y, mono(rowSize), ICE, 'left', 1)
      if (typedN >= k.length && v) {
        ctx.font = mono(rowSize)
        ctx.letterSpacing = '1px'
        const kw = ctx.measureText(k).width + 12
        ctx.letterSpacing = '0px'
        const vw = ctx.measureText(v).width + 12
        ctx.fillStyle = FAINT
        for (let x = left + kw; x < right - vw; x += 10) ctx.fillRect(x, y + 6, 3, 2)
        write(ctx, v, right, y, mono(rowSize), ALERT, 'right')
      }
      y += rowSize * 1.45
    })
    if (t >= U_TALLY + 0.9) {
      const u = ease((t - U_TALLY - 1.0) / 0.9)
      const you = this.share() * u
      const bh = 20
      const bw = right - left
      ctx.fillStyle = 'rgba(255, 178, 62, 0.35)'
      ctx.fillRect(left, y - bh / 2, bw, bh)
      ctx.fillStyle = ALERT
      ctx.fillRect(left, y - bh / 2, (bw * you) / 100, bh)
      ctx.strokeStyle = FAINT
      ctx.strokeRect(left + 0.5, y - bh / 2 + 0.5, bw - 1, bh - 1)
      y += bh + 6
      write(ctx, `YOU ${you.toFixed(1)}%`, left, y + 6, mono(rowSize - 4), ALERT, 'left')
      write(ctx, `EVERYONE ELSE ${(100 - you).toFixed(1)}%`, right, y + 6, mono(rowSize - 4), AMBER, 'right')
      y += 40
    } else y += 46
    y += 28

    // the valuation
    if (t >= U_VALUE) {
      write(ctx, 'VALUATION', cx, y, mono(rowSize), DIM, 'center', 4)
      y += 64
      const start = Math.max(1e6, this.stats.score * 1e6)
      let shown: string
      if (t < U_SPIN) shown = money(start)
      else if (t < U_INF) {
        const u = (t - U_SPIN) / (U_INF - U_SPIN)
        const exp = Math.log10(start) + (19.5 - Math.log10(start)) * u ** 2.2
        shown = money(10 ** exp)
        if (u > 0.85) shown = shown.replace(/\d/g, (d) => (Math.random() < 0.5 ? d : String(Math.floor(Math.random() * 10))))
      } else shown = '∞'
      const big = t >= U_INF ? Math.min(150, dw / 4) : Math.min(84, dw / (shown.length * 0.82 + 1))
      ctx.save()
      ctx.shadowColor = t >= U_INF ? ALERT : GLOW
      ctx.shadowBlur = t >= U_INF ? 36 : 14
      write(ctx, shown, cx, y, t >= U_INF ? `700 ${big}px ${MONO}` : display(big, 700), t >= U_INF ? ALERT : ICE, 'center')
      ctx.restore()
      y += 92
    } else y += 156

    // what it costs everyone else
    if (t >= U_LINE) {
      const lf = mono(portrait ? 30 : 34)
      const lines = wrapText(ctx, 'Every gigabyte you grab is one nobody else can afford.', lf, dw - 20)
      ctx.globalAlpha = ease((t - U_LINE) / 0.3)
      for (const l of lines) {
        write(ctx, l, cx, y, lf, ICE, 'center', 1)
        y += portrait ? 36 : 40
      }
      ctx.globalAlpha = 1
    }
    if (t >= U_READY) this.prompt(ctx, cx, dh - 22, 24, view)
  }

  // ----------------------------------------------------------- 2. timeline

  private drawTimeline(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): void {
    this.crtBackground(ctx, W, H)
    const portrait = H > W * 1.1
    const dw = portrait ? 480 : 860
    const s = Math.min(1.3, (W - 32) / dw, H / 720)
    const ox = (W - dw * s) / 2
    const vh = H / s
    const year = new Date().getFullYear()

    ctx.save()
    ctx.translate(ox, -this.cam * s)
    ctx.scale(s, s)

    let y = 50
    ctx.globalAlpha = ease(this.t / 0.5)
    write(ctx, 'WHAT HAPPENED', dw / 2, y, `italic ${display(portrait ? 40 : 48)}`, ICE, 'center')
    y += portrait ? 48 : 56
    const sub = 'AND WHAT HAPPENS IF PRICES KEEP RISING'
    write(ctx, sub, dw / 2, y, mono(fitSize(ctx, sub, mono, portrait ? 24 : 28, dw - 10)), ALERT, 'center', 2)
    ctx.globalAlpha = 1
    y += 70

    const spine = portrait ? 108 : 190
    const tx = spine + 30
    const tw = dw - tx - (portrait ? 4 : 40)
    const textFont = mono(portrait ? 28 : 30)
    const lh = portrait ? 28 : 30
    let lastBottom = y
    let spineTop = y - 20

    for (let i = 0; i < this.items.length; i++) {
      if (i >= this.shown) break
      const item = this.items[i]!
      const age = this.t - this.revealTime(i)
      const a = ease(age / 0.45)
      ctx.globalAlpha = a
      const slide = (1 - a) * 14

      if (item.kind === 'today') {
        // the spine above stays solid; from here on it is dashed
        this.spineSegment(ctx, spine, spineTop, y, false)
        y += 26
        ctx.save()
        ctx.shadowColor = ALERT
        ctx.shadowBlur = 16
        ctx.fillStyle = ALERT
        ctx.fillRect(0, y - 1.5, dw * ease(age / 0.6), 3)
        ctx.restore()
        const label = `TODAY · ${year}`
        ctx.font = display(portrait ? 22 : 24, 700)
        const lw = ctx.measureText(label).width + 24
        ctx.fillStyle = ALERT
        const lx = Math.max(lw / 2, spine)
        ctx.fillRect(lx - lw / 2, y - 18, lw, 36)
        write(ctx, label, lx, y + 1, display(portrait ? 22 : 24, 700), VOID, 'center', 1)
        y += 46
        const msg = wrapText(ctx, 'Everything above this line happened. Everything below it has not. Yet.', mono(portrait ? 24 : 26), dw - 20)
        for (const l of msg) {
          write(ctx, l, dw / 2, y, mono(portrait ? 24 : 26), ALERT, 'center')
          y += portrait ? 26 : 28
        }
        y += 34
        spineTop = y - 20
      } else {
        const m = item.m
        const proj = !m.real
        const color = proj ? PROJ : ICE
        // dot
        ctx.beginPath()
        ctx.arc(spine, y + 2, 7, 0, Math.PI * 2)
        if (proj) {
          ctx.fillStyle = VOID
          ctx.fill()
          ctx.strokeStyle = PROJ
          ctx.lineWidth = 2
          ctx.stroke()
        } else {
          ctx.fillStyle = ICE
          ctx.fill()
        }
        const last = m === TIMELINE[TIMELINE.length - 1]
        write(ctx, m.year, spine - 20 - slide, y + 2, display(portrait ? 22 : 30, 700), proj ? PROJ : GLOW, 'right')
        const lines = wrapText(ctx, m.text, textFont, tw)
        let ly = y + 2
        lines.forEach((l) => {
          ctx.save()
          if (last) {
            ctx.shadowColor = PROJ
            ctx.shadowBlur = 12
          }
          write(ctx, l, tx + slide, ly, textFont, color, 'left')
          ctx.restore()
          ly += lh
        })
        if (proj) {
          ctx.font = mono(18)
          const tagW = ctx.measureText('PROJECTION').width + 12
          ctx.strokeStyle = PROJ
          ctx.lineWidth = 1
          ctx.setLineDash([3, 3])
          ctx.strokeRect(tx + slide + 0.5, ly - 6.5, tagW, 20)
          ctx.setLineDash([])
          write(ctx, 'PROJECTION', tx + slide + 6, ly + 4, mono(18), PROJ, 'left', 1)
          ly += 26
        } else if (m.source) {
          write(ctx, `SOURCE · ${m.source.toUpperCase()}`, tx + slide, ly + 2, mono(19), FAINT, 'left', 1)
          ly += 22
        }
        y = ly + (portrait ? 22 : 24)
      }
      lastBottom = y
      ctx.globalAlpha = 1
    }
    // the spine below the last item
    const todayIdx = this.items.findIndex((it) => it.kind === 'today')
    this.spineSegment(ctx, spine, spineTop, lastBottom - 20, this.shown > todayIdx)
    ctx.restore()

    // follow the newest entry
    this.camTarget = Math.max(0, lastBottom + 90 - vh)

    // fade the top edge so text scrolls away softly
    const fadeH = Math.min(80, H * 0.12)
    const top = ctx.createLinearGradient(0, 0, 0, fadeH)
    top.addColorStop(0, VOID)
    top.addColorStop(1, 'rgba(1, 4, 11, 0)')
    if (this.cam > 4) {
      ctx.fillStyle = top
      ctx.fillRect(0, 0, W, fadeH)
    }
    const bot = ctx.createLinearGradient(0, H - fadeH, 0, H)
    bot.addColorStop(0, 'rgba(1, 4, 11, 0)')
    bot.addColorStop(1, VOID)
    ctx.fillStyle = bot
    ctx.fillRect(0, H - fadeH, W, fadeH)
    if (this.shown >= this.items.length && this.t - this.lastShownAt > 0.6) {
      this.prompt(ctx, W / 2, H - Math.max(22, 26 * s), Math.max(18, 24 * s), view)
    }
  }

  private revealTime(i: number): number {
    // approximate: newest one is lastShownAt; older ones are long settled
    return i === this.shown - 1 ? this.lastShownAt : -10
  }

  private spineSegment(ctx: CanvasRenderingContext2D, x: number, y0: number, y1: number, dashed: boolean): void {
    if (y1 <= y0) return
    ctx.save()
    ctx.strokeStyle = dashed ? PROJ : 'rgba(226, 245, 255, 0.55)'
    ctx.lineWidth = 2
    if (dashed) ctx.setLineDash([8, 8])
    ctx.lineDashOffset = dashed ? -this.t * 12 : 0
    ctx.beginPath()
    ctx.moveTo(x, y0)
    ctx.lineTo(x, y1)
    ctx.stroke()
    ctx.restore()
  }

  // ----------------------------------------------------------- 3. seizure

  private drawSeizure(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): Hit[] {
    const t = this.t
    if (t < 0.45) {
      // static as the tube lets go
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)
      for (let i = 0; i < 260; i++) {
        const g = Math.floor(Math.random() * 255)
        ctx.fillStyle = `rgb(${g}, ${g}, ${g})`
        ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 60, 2)
      }
      return []
    }
    const os = this.os
    drawDesktop(ctx, os, W, H, t)

    // white-out after complying
    const out = this.complied >= 0 ? clamp((t - this.complied - 3.9) / 2.2, 0, 1) : 0
    const hits: Hit[] = []

    if (t >= this.noticeAt) {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * ease((t - this.noticeAt) / 0.3)})`
      ctx.fillRect(0, 0, W, H)
      const rects = this.drawNoticeWindow(ctx, W, H, view)
      if (rects && this.complied < 0) {
        hits.push({ id: 'no', ...rects.object })
        hits.push({ id: 'yes', ...rects.comply })
      }
    } else if (t > 1.0) {
      // a scan happens first, quietly, in the corner
      this.drawToast(ctx, W, H, 'System', 'Checking installed memory…', t - 1.0)
    }

    if (out > 0) {
      ctx.fillStyle = `rgba(246, 246, 243, ${out})`
      ctx.fillRect(0, 0, W, H)
    }
    return hits
  }

  private drawToast(ctx: CanvasRenderingContext2D, W: number, H: number, title: string, body: string, life: number): void {
    const f = family(this.os)
    const w = Math.min(340, W - 24)
    const h = 62
    const slide = ease(life / 0.3)
    const x = f === 'windows' ? W - w - 12 + (1 - slide) * 360 : f === 'linux' ? W / 2 - w / 2 : W - w - 12 + (1 - slide) * 360
    const y = f === 'windows' ? H - 48 - h - 12 : f === 'apple' ? 34 : 38
    ctx.save()
    ctx.globalAlpha = slide
    ctx.shadowColor = 'rgba(0,0,0,0.4)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 6
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, f === 'windows' ? 8 : 14)
    ctx.fillStyle = f === 'apple' ? 'rgba(246, 246, 246, 0.96)' : f === 'windows' ? '#2b2b2b' : '#353535'
    ctx.fill()
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = slide
    const ink = f === 'apple' ? '#1d1d1f' : '#ffffff'
    this.gearIcon(ctx, x + 16, y + h / 2 - 15, 30, f === 'apple' ? '#8e8e93' : '#9a9a9a')
    write(ctx, title, x + 58, y + 22, uiFont(this.os, 13, 700), ink)
    write(ctx, body, x + 58, y + 42, uiFont(this.os, 13), ink)
    ctx.restore()
  }

  private gearIcon(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
    ctx.save()
    ctx.translate(x + s / 2, y + s / 2)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.24)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    // a memory stick
    ctx.fillRect(-s * 0.34, -s * 0.16, s * 0.68, s * 0.3)
    ctx.fillStyle = color
    for (let i = 0; i < 4; i++) ctx.fillRect(-s * 0.27 + i * s * 0.15, -s * 0.1, s * 0.09, s * 0.16)
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < 6; i++) ctx.fillRect(-s * 0.3 + i * s * 0.11, s * 0.16, s * 0.05, s * 0.08)
    ctx.restore()
  }

  // An official-looking seal: a plain circle with a chip in it. No real emblem.
  private seal(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.save()
    ctx.translate(x, y)
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fillStyle = '#7a1622'
    ctx.fill()
    ctx.strokeStyle = '#e8c56a'
    ctx.lineWidth = Math.max(1.5, r * 0.08)
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2)
    ctx.stroke()
    const c = r * 0.62
    ctx.fillStyle = '#e8c56a'
    ctx.fillRect(-c / 2, -c / 2, c, c)
    ctx.fillStyle = '#7a1622'
    ctx.fillRect(-c / 2 + c * 0.18, -c / 2 + c * 0.18, c * 0.64, c * 0.64)
    ctx.fillStyle = '#e8c56a'
    for (let i = 0; i < 3; i++) {
      const o = -c * 0.3 + i * c * 0.3
      ctx.fillRect(o - c * 0.05, -c * 0.72, c * 0.1, c * 0.22)
      ctx.fillRect(o - c * 0.05, c * 0.5, c * 0.1, c * 0.22)
      ctx.fillRect(-c * 0.72, o - c * 0.05, c * 0.22, c * 0.1)
      ctx.fillRect(c * 0.5, o - c * 0.05, c * 0.22, c * 0.1)
    }
    ctx.restore()
  }

  // The notice's body, worded for how much memory this device reports.
  // Browsers report at most 8 GB, so 8 means "at least 8".
  private noticeText(): string[] {
    const mem = this.memory
    const why = 'Memory is too scarce to sit idle in homes.'
    const after = 'Please leave the device powered on. Your cloud computer is ready: $3 a month.'
    if (mem == null) {
      return [
        'This device contains privately held memory.',
        `Memory above the personal allowance of ${ALLOWANCE} GB is to be collected. ${why}`,
        after,
      ]
    }
    const atLeast = mem >= 8
    const has = `${atLeast ? 'at least ' : ''}${gb(mem)}`
    if (mem > ALLOWANCE) {
      return [
        `This device contains ${has} of memory. The personal allowance is ${ALLOWANCE} GB.`,
        `${atLeast ? 'At least ' : 'The '}${gb(mem - ALLOWANCE)} above the allowance is to be collected. ${why}`,
        after,
      ]
    }
    return [
      `This device contains ${has} of memory, within the personal allowance of ${ALLOWANCE} GB.`,
      `On 1 January the allowance falls to 0 GB, and this memory is registered for collection. ${why}`,
      after,
    ]
  }

  // Local memory left once the notice has been complied with.
  private memoryLeft(): number | null {
    const mem = this.memory
    if (mem == null) return null
    return mem > ALLOWANCE ? ALLOWANCE : 0
  }

  private drawNoticeWindow(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): { comply: Rect; object: Rect } | null {
    const os = this.os
    const fam = family(os)
    const t = this.t
    const appear = ease((t - this.noticeAt) / 0.22)
    const phone = W < 520
    const w = Math.min(500, W - 24)
    const pad = phone ? 18 : 26
    const inner = w - pad * 2
    const ink = '#1b1b1f'
    const soft = '#55555c'
    const bodySize = phone ? 14 : 15
    const mem = this.memory
    const paras = this.noticeText()
    const bodyFont = uiFont(os, bodySize)
    const wrapped = paras.map((p) => wrapText(ctx, p, bodyFont, inner))
    const lineH = bodySize * 1.42
    const sealR = phone ? 22 : 26
    const head = sealR * 2 + 16 + 26 + 22 + 18
    const bodyH = wrapped.reduce((n, l) => n + l.length * lineH + 10, 0)
    const progressH = 64
    const metaH = 44
    const btnH = fam === 'apple' ? 30 : 34
    const bar = fam === 'windows' ? 32 : fam === 'apple' ? 28 : 40
    const h = bar + pad + head + bodyH + metaH + Math.max(progressH, btnH + 26) + pad - 14
    const shake = this.objected >= 0 && t - this.objected < 0.45 ? Math.sin((t - this.objected) * 70) * 9 * (1 - (t - this.objected) / 0.45) : 0
    const x = Math.round(W / 2 - w / 2 + shake)
    // short screens (a phone on its side) get the notice scaled down to fit
    const fitS = Math.min(1, (H - 20) / h)
    const y = fitS < 1 ? Math.round(H / 2 - h / 2) : Math.round(Math.max(fam === 'windows' ? 12 : 40, H / 2 - h / 2 - (fam === 'windows' ? 24 : 0)))
    ctx.save()
    ctx.globalAlpha = appear
    const sc = fitS * (0.96 + 0.04 * appear)
    ctx.translate(W / 2, y + h / 2)
    ctx.scale(sc, sc)
    ctx.translate(-W / 2, -(y + h / 2))
    const body = drawWindow(ctx, os, { x, y, w, h }, 'Memory Allocation Notice', false)

    let cy = body.y + pad + sealR
    this.seal(ctx, x + w / 2, cy, sealR)
    cy += sealR + 16
    write(ctx, 'MEMORY ALLOCATION AUTHORITY', x + w / 2, cy, uiFont(os, phone ? 10 : 11, 700), '#7a1622', 'center', 1.5)
    cy += 26
    write(ctx, 'Notice of Collection', x + w / 2, cy, uiFont(os, phone ? 19 : 21, 700), ink, 'center')
    cy += 22
    write(ctx, 'Memory Allocation Act, §4(b)', x + w / 2, cy, uiFont(os, phone ? 12 : 13), soft, 'center')
    cy += 18
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    ctx.fillRect(x + pad, cy, inner, 1)
    cy += 16
    wrapped.forEach((lines, i) => {
      for (const l of lines) {
        write(ctx, l, x + pad, cy + lineH / 2 - 2, i === 0 ? uiFont(os, bodySize, 600) : bodyFont, ink, 'left')
        cy += lineH
      }
      cy += 10
    })
    write(ctx, 'Ref. MAA-20XX-0000001 · Issued automatically. No reply is possible.', x + pad, cy + 6, uiFont(os, phone ? 10 : 11), soft, 'left')
    write(ctx, 'RAM GRAB · a work of fiction · nothing is collected', x + pad, cy + 24, uiFont(os, phone ? 10 : 11), '#9a9aa0', 'left')
    cy += metaH

    let result: { comply: Rect; object: Rect } | null = null
    if (this.complied < 0) {
      const gap = 10
      const bw = fam === 'apple' ? (inner - gap) / 2 : Math.min(140, (inner - gap) / 2)
      const bx = fam === 'apple' ? x + pad : x + w - pad - bw * 2 - gap
      const object = { x: bx, y: cy, w: bw, h: btnH }
      const comply = { x: bx + bw + gap, y: cy, w: bw, h: btnH }
      const hoverC = view.hover === 'yes'
      // Object: greyed out
      ctx.beginPath()
      ctx.roundRect(object.x, object.y, object.w, object.h, fam === 'windows' ? 4 : 6)
      ctx.fillStyle = '#ececee'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 1
      ctx.stroke()
      write(ctx, 'Object', object.x + bw / 2, object.y + btnH / 2, uiFont(os, 14), '#a8a8ae', 'center')
      ctx.beginPath()
      ctx.roundRect(comply.x, comply.y, comply.w, comply.h, fam === 'windows' ? 4 : 6)
      ctx.fillStyle = fam === 'windows' ? (hoverC ? '#1970c2' : '#005fb8') : fam === 'apple' ? (hoverC ? '#2a94ff' : '#0a84ff') : hoverC ? '#4a92e8' : '#3584e4'
      ctx.fill()
      write(ctx, 'Comply', comply.x + bw / 2, comply.y + btnH / 2, uiFont(os, 14, 600), '#ffffff', 'center')
      if (this.objected >= 0) {
        const msg = this.objections > 2 ? 'There is no one to object to.' : 'Objections are no longer processed.'
        write(ctx, msg, fam === 'apple' ? x + w / 2 : x + w - pad, cy + btnH + 16, uiFont(os, 12, 600), '#c42b1c', fam === 'apple' ? 'center' : 'right')
      }
      // map to screen space through the appear scale
      const map = (r: Rect): Rect => ({
        x: W / 2 + (r.x - W / 2) * sc,
        y: y + h / 2 + (r.y - (y + h / 2)) * sc,
        w: r.w * sc,
        h: r.h * sc,
      })
      result = { comply: map(comply), object: map(object) }
    } else {
      const u = clamp((t - this.complied - 0.3) / 3.4, 0, 1)
      const steps = ['Registering device…', 'Releasing local memory…', 'Moving you to the cloud…', 'Done. Welcome.']
      const step = steps[Math.min(steps.length - 1, Math.floor(u * (steps.length - 1) + (u >= 1 ? 1 : 0)))]!
      write(ctx, step, x + pad, cy + 8, uiFont(os, 13, 600), ink, 'left')
      write(ctx, `${Math.floor(u * 100)}%`, x + w - pad, cy + 8, uiFont(os, 13), soft, 'right')
      ctx.beginPath()
      ctx.roundRect(x + pad, cy + 26, inner, 6, 3)
      ctx.fillStyle = '#e4e4e8'
      ctx.fill()
      ctx.beginPath()
      ctx.roundRect(x + pad, cy + 26, Math.max(6, inner * u), 6, 3)
      ctx.fillStyle = fam === 'windows' ? '#005fb8' : fam === 'apple' ? '#0a84ff' : '#3584e4'
      ctx.fill()
      const left = this.memoryLeft()
      const now = mem == null || left == null ? 0 : left + (Math.min(mem, 8) - left) * (1 - u)
      write(ctx, `Local memory: ${mem == null || left == null ? '—' : gb(mem >= 1 ? Math.round(now) : now)}`, x + pad, cy + 48, uiFont(os, 11), soft, 'left')
    }
    ctx.restore()
    return result
  }

  // ----------------------------------------------------------- 4. hivemind

  // A plain chat with the player's cloud computer, on white. No real app.
  private drawHivemind(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): void {
    const t = this.hiveT
    const os = this.os
    const phone = W < 560
    const u = t - CHAT_LEAD
    const st = u >= 0 ? chatAt(u) : { bubbles: [], composer: '', suggested: false, dots: false }
    const ACCENT = '#5260c9'
    const INK = '#1f2430'
    const GREY = '#8a8f9c'
    const LINE = '#e8e9ee'

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = ease(t / 0.8)

    const cw = Math.min(620, W - 24)
    const x0 = (W - cw) / 2
    const hh = phone ? 62 : 70
    const ch = phone ? 66 : 74

    // header: who you are talking to
    ctx.fillStyle = '#fbfbfc'
    ctx.fillRect(0, 0, W, hh)
    ctx.fillStyle = LINE
    ctx.fillRect(0, hh, W, 1)
    const ar = phone ? 17 : 19
    const ax = x0 + ar + 2
    const ay = hh / 2
    ctx.beginPath()
    ctx.arc(ax, ay, ar, 0, Math.PI * 2)
    ctx.fillStyle = '#e6e9f8'
    ctx.fill()
    // a small cloud
    ctx.fillStyle = ACCENT
    ctx.beginPath()
    ctx.arc(ax - ar * 0.28, ay + ar * 0.08, ar * 0.3, 0, Math.PI * 2)
    ctx.arc(ax + ar * 0.06, ay - ar * 0.12, ar * 0.38, 0, Math.PI * 2)
    ctx.arc(ax + ar * 0.38, ay + ar * 0.1, ar * 0.26, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(ax - ar * 0.28, ay + ar * 0.05, ar * 0.66, ar * 0.31)
    write(ctx, 'Your cloud', ax + ar + 12, ay - 9, uiFont(os, phone ? 15 : 16, 600), INK)
    ctx.fillStyle = '#3fbf7f'
    ctx.beginPath()
    ctx.arc(ax + ar + 16, ay + 11, 3.5, 0, Math.PI * 2)
    ctx.fill()
    write(ctx, 'online · $3 a month', ax + ar + 25, ay + 11, uiFont(os, phone ? 12 : 13), GREY)
    const left = this.memoryLeft()
    if (!phone) write(ctx, `local memory: ${left == null ? 'released' : gb(left)}`, x0 + cw, ay, uiFont(os, 12), '#a3a7b1', 'right')

    // the conversation, newest at the bottom
    const top = hh + 14
    const bottom = H - ch - 12
    const fs = phone ? 15 : 16
    const font = uiFont(os, fs)
    const lh = fs * 1.35
    const padX = 14
    const padY = 9
    const maxW = Math.min(cw * 0.76, 420)
    type Laid = { kind: 'chip' } | { kind: 'dots' } | { kind: 'b'; b: Bubble; lines: string[]; w: number; h: number }
    const laid: Laid[] = [{ kind: 'chip' }]
    for (const b of st.bubbles) {
      const lines = b.text ? wrapText(ctx, b.text, font, maxW - padX * 2) : ['']
      ctx.font = font
      const w = Math.max(28, ...lines.map((l) => ctx.measureText(l).width)) + padX * 2
      laid.push({ kind: 'b', b, lines, w, h: lines.length * lh + padY * 2 })
    }
    if (st.dots) laid.push({ kind: 'dots' })
    const heights = laid.map((it, i) => {
      const prev = laid[i - 1]
      const gap = i === 0 ? 0 : prev && prev.kind === 'b' && it.kind === 'b' && prev.b.side === it.b.side ? 6 : 14
      if (it.kind === 'chip') return 30
      if (it.kind === 'dots') return gap + 36
      return gap + it.h + (it.b.edited && it.b.side === 'me' ? 18 : 0)
    })
    const total = heights.reduce((a2, b2) => a2 + b2, 0)
    let y = top + Math.min(0, bottom - top - total)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, top - 6, W, bottom - top + 12)
    ctx.clip()
    laid.forEach((it, i) => {
      const hgt = heights[i]!
      if (it.kind === 'chip') {
        ctx.globalAlpha = ease((t - 0.4) / 0.8)
        const label = left == null ? 'Local memory released · connected to the cloud' : `Memory above ${ALLOWANCE} GB released · connected to the cloud`
        const cf = uiFont(os, phone ? 11 : 12)
        ctx.font = cf
        const lw = Math.min(cw, ctx.measureText(label).width + 24)
        ctx.beginPath()
        ctx.roundRect(W / 2 - lw / 2, y + 2, lw, 22, 11)
        ctx.fillStyle = '#f1f2f5'
        ctx.fill()
        write(ctx, label, W / 2, y + 13, cf, GREY, 'center')
        ctx.globalAlpha = 1
        y += hgt
        return
      }
      const gapTop = it.kind === 'dots' ? hgt - 36 : hgt - it.h - (it.b.edited && it.b.side === 'me' ? 18 : 0)
      y += gapTop
      if (it.kind === 'dots') {
        ctx.beginPath()
        ctx.roundRect(x0, y, 60, 36, [18, 18, 18, 5])
        ctx.fillStyle = '#eff0f4'
        ctx.fill()
        for (let k = 0; k < 3; k++) {
          const bounce = Math.max(0, Math.sin(t * 7 - k * 0.8)) * 3
          ctx.fillStyle = '#9aa0ad'
          ctx.beginPath()
          ctx.arc(x0 + 18 + k * 12, y + 18 - bounce, 3.2, 0, Math.PI * 2)
          ctx.fill()
        }
        y += 36
        return
      }
      const b = it.b
      const age = u - b.at
      const pop = ease(age / 0.25)
      const me = b.side === 'me'
      const bx = me ? x0 + cw - it.w : x0
      ctx.save()
      ctx.globalAlpha = pop
      ctx.translate(0, (1 - pop) * 10)
      ctx.beginPath()
      ctx.roundRect(bx, y, it.w, it.h, me ? [18, 18, 5, 18] : [18, 18, 18, 5])
      ctx.fillStyle = me ? ACCENT : '#eff0f4'
      ctx.fill()
      let ly = y + padY + lh / 2
      for (const l of it.lines) {
        write(ctx, l, bx + padX, ly, font, me ? '#ffffff' : INK)
        ly += lh
      }
      if (b.edited && me) write(ctx, 'edited by your cloud', x0 + cw - 4, y + it.h + 10, uiFont(os, 11), '#a3a7b1', 'right')
      ctx.restore()
      y += it.h + (b.edited && me ? 18 : 0)
    })
    ctx.restore()

    // the composer
    ctx.fillStyle = '#fbfbfc'
    ctx.fillRect(0, H - ch, W, ch)
    ctx.fillStyle = LINE
    ctx.fillRect(0, H - ch, W, 1)
    const ih = phone ? 40 : 44
    const iy = H - ch / 2 - ih / 2
    const sendR = ih / 2
    const iw = cw - sendR * 2 - 10
    ctx.beginPath()
    ctx.roundRect(x0, iy, iw, ih, ih / 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.strokeStyle = st.suggested ? ACCENT : '#dcdee5'
    ctx.lineWidth = 1
    ctx.stroke()
    const cf = uiFont(os, fs)
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 + 8, iy, iw - 16, ih)
    ctx.clip()
    const done = u >= CHAT.doneAt - 0.3
    if (st.composer) {
      ctx.font = cf
      const tw = ctx.measureText(st.composer).width
      const tx = x0 + 18 - Math.max(0, tw - (iw - 40))
      write(ctx, st.composer, tx, iy + ih / 2, cf, st.suggested ? ACCENT : INK)
      if (Math.floor(t * 2) % 2 === 0) {
        ctx.fillStyle = st.suggested ? ACCENT : INK
        ctx.fillRect(tx + tw + 2, iy + ih / 2 - fs * 0.6, 1.5, fs * 1.2)
      }
    } else if (done) {
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(t * 2.4)
      write(ctx, view.touch ? 'Tap to disconnect' : 'Press Enter to disconnect', x0 + 18, iy + ih / 2, cf, GREY)
      ctx.globalAlpha = 1
    } else write(ctx, 'Message', x0 + 18, iy + ih / 2, cf, '#b3b7c0')
    ctx.restore()
    const sx = x0 + cw - sendR
    const sy = iy + ih / 2
    ctx.beginPath()
    ctx.arc(sx, sy, sendR, 0, Math.PI * 2)
    ctx.fillStyle = st.composer ? ACCENT : '#e3e5ec'
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(sx, sy + sendR * 0.4)
    ctx.lineTo(sx, sy - sendR * 0.4)
    ctx.moveTo(sx - sendR * 0.32, sy - sendR * 0.08)
    ctx.lineTo(sx, sy - sendR * 0.4)
    ctx.lineTo(sx + sendR * 0.32, sy - sendR * 0.08)
    ctx.stroke()
    ctx.lineCap = 'butt'
    ctx.globalAlpha = 1
  }

  // ----------------------------------------------------------- 5. end

  private drawEnd(ctx: CanvasRenderingContext2D, W: number, H: number, view: View): Hit[] {
    const t = this.t
    if (t < 0.9) {
      // the white screen goes out
      const k = ease(t / 0.9)
      const v = Math.round(255 * (1 - k))
      ctx.fillStyle = `rgb(${v}, ${v}, ${v})`
      ctx.fillRect(0, 0, W, H)
      return []
    }
    this.crtBackground(ctx, W, H)
    const portrait = H > W * 1.1
    const dw = portrait ? 440 : 760
    const q = ALTMAN_RAM_QUOTE
    const qf = mono(portrait ? 27 : 29)
    const ql = portrait ? 29 : 31
    const qPad = 22
    const qLines = wrapText(ctx, `“${q.text}”`, qf, dw - qPad * 2 - 10)
    const attr = `— ${q.who}, ${q.where}, ${q.date} · via PCWorld`
    const af = mono(portrait ? 19 : 21)
    const aLines = wrapText(ctx, attr, af, dw - qPad * 2 - 10)
    const qh = qPad + qLines.length * ql + 10 + aLines.length * 24 + qPad - 6
    // layout height: title, quote card, line, valuation, button, hint
    const dh = 130 + qh + 48 + 52 + 60 + 60 + 30
    const f = fitTo(W, H, dw, dh, 1.5)
    ctx.translate(f.ox, f.oy)
    ctx.scale(f.s, f.s)
    const cx = dw / 2
    const a = (at: number) => ease((t - at) / 0.7)
    let y = 50

    ctx.globalAlpha = a(1.0)
    ctx.save()
    ctx.shadowColor = GLOW
    ctx.shadowBlur = 18
    const ts = fitSize(ctx, 'THIS WAS A GAME.', (n) => `italic ${display(n)}`, 64, dw - 20)
    write(ctx, 'THIS WAS A GAME.', cx, y, `italic ${display(ts)}`, ICE, 'center')
    ctx.restore()
    y += 80

    // the quote: the hook
    ctx.globalAlpha = a(1.6)
    ctx.fillStyle = 'rgba(255, 45, 111, 0.08)'
    ctx.fillRect(0, y, dw, qh)
    ctx.fillStyle = ALERT
    ctx.fillRect(0, y, 3, qh)
    let qy = y + qPad + ql / 2 - 4
    for (const l of qLines) {
      write(ctx, l, qPad, qy, qf, ICE, 'left')
      qy += ql
    }
    qy += 10
    for (const l of aLines) {
      write(ctx, l, qPad, qy, af, DIM, 'left')
      qy += 24
    }
    y += qh + 48

    ctx.globalAlpha = a(2.4)
    const line = 'Memory prices are not a game.'
    write(ctx, line, cx, y, mono(fitSize(ctx, line, mono, portrait ? 36 : 40, dw - 10)), ALERT, 'center', 1)
    y += 52

    ctx.globalAlpha = a(2.9)
    const val = `FINAL VALUATION ${money(Math.max(1e6, this.stats.score * 1e6))}`
    write(ctx, val, cx, y, mono(fitSize(ctx, val, mono, 22, dw - 20)), DIM, 'center', 2)
    y += 60

    let hits: Hit[] = []
    const ba = a(3.0)
    if (ba > 0) {
      ctx.globalAlpha = ba
      const bw = 300
      const bh = 64
      const bx = cx - bw / 2
      const by = y - bh / 2
      const hover = view.hover === 'again'
      ctx.fillStyle = hover ? ALERT : 'rgba(255, 45, 111, 0.12)'
      ctx.fillRect(bx, by, bw, bh)
      ctx.strokeStyle = ALERT
      ctx.lineWidth = 2
      ctx.strokeRect(bx + 1, by + 1, bw - 2, bh - 2)
      write(ctx, 'PLAY AGAIN', cx, y + 1, display(26, 700), hover ? VOID : ICE, 'center', 2)
      if (t > this.endReady) hits = [{ id: 'again', x: f.ox + bx * f.s, y: f.oy + by * f.s, w: bw * f.s, h: bh * f.s }]
      y += bh / 2 + 28
      if (!view.touch) write(ctx, 'OR PRESS ENTER', cx, y, mono(20), FAINT, 'center', 2)
    }
    ctx.globalAlpha = 1
    return hits
  }
}
