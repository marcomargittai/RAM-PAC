import type { SceneId } from './story'

const W = 256
const H = 144

const INK = '#07040f'
const GOLD = '#ffb000'
const GOLD_HOT = '#ffe08a'
const CYAN = '#3ad7ff'
const MAGENTA = '#ff2e93'
const PAPER = '#f4f0e6'
const RED = '#e1062c'
const LAWN = '#1f7a45'
const BRICK = '#a84838'
const WOOD = '#6a3a22'

function px(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w = 1, h = 1): void {
  if (w <= 0 || h <= 0) return
  ctx.fillStyle = color
  ctx.fillRect(x | 0, y | 0, w | 0, h | 0)
}

function hash(x: number, y: number): number {
  let n = (x * 374761393 + y * 668265263) | 0
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return (n ^ (n >>> 16)) >>> 0
}

function dither(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number, gap = 2): void {
  ctx.fillStyle = color
  for (let yy = y; yy < y + h; yy += gap) {
    const shift = ((yy / gap) | 0) % 2
    for (let xx = x + shift; xx < x + w; xx += gap) ctx.fillRect(xx, yy, 1, 1)
  }
}

function bands(ctx: CanvasRenderingContext2D, colors: string[], y0: number, y1: number): void {
  const span = y1 - y0
  const row = Math.max(1, Math.ceil(span / colors.length))
  colors.forEach((color, i) => px(ctx, color, 0, y0 + i * row, W, row + 1))
}

function stars(ctx: CanvasRenderingContext2D, count: number, yMax: number, color: string, time: number): void {
  for (let i = 0; i < count; i++) {
    const x = hash(i, 3) % W
    const y = hash(i, 9) % yMax
    const tw = (hash(i, 1) + time * 6) % 7
    if (tw < 1.2) continue
    const big = hash(i, 5) % 11 === 0
    px(ctx, color, x, y, big ? 2 : 1, big ? 2 : 1)
  }
}

function disc(ctx: CanvasRenderingContext2D, color: string, cx: number, cy: number, r: number): void {
  for (let y = -r; y <= r; y++) {
    const span = Math.round(Math.sqrt(r * r - y * y))
    px(ctx, color, cx - span, cy + y, span * 2 + 1, 1)
  }
}

function person(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  coat: string,
  time: number,
  phase = 0,
): void {
  const step = Math.sin(time * 3 + phase) > 0 ? 1 : 0
  px(ctx, '#f0d2b0', x + 2, y, 3, 3)
  px(ctx, INK, x + 2, y, 3, 1)
  px(ctx, coat, x + 1, y + 3, 5, 5)
  px(ctx, INK, x + 2, y + 8, 1, 3 + step)
  px(ctx, INK, x + 4, y + 8, 1, 4 - step)
}

function edge(ctx: CanvasRenderingContext2D): void {
  px(ctx, INK, 0, 0, W, 2)
  px(ctx, INK, 0, H - 2, W, 2)
  px(ctx, INK, 0, 0, 2, H)
  px(ctx, INK, W - 2, 0, 2, H)
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}

function mix(from: string, to: string, t: number): string {
  const u = t <= 0 ? 0 : t >= 1 ? 1 : t
  const a = Number.parseInt(from.slice(1), 16)
  const b = Number.parseInt(to.slice(1), 16)
  const channel = (shift: number) => {
    const av = (a >> shift) & 255
    const bv = (b >> shift) & 255
    return Math.round(av + (bv - av) * u)
  }
  const n = (channel(16) << 16) | (channel(8) << 8) | channel(0)
  return `#${n.toString(16).padStart(6, '0')}`
}

const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00110', '01010', '10010', '11111', '00010', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['01110', '10000', '11110', '10001', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
}

function textWidth(word: string, scale = 1): number {
  if (!word) return 0
  let width = 0
  for (let i = 0; i < word.length; i++) {
    width += (word.charAt(i) === ' ' ? 3 : 5) * scale
    if (i < word.length - 1) width += scale
  }
  return width
}

function say(ctx: CanvasRenderingContext2D, word: string, x: number, y: number, color: string, scale = 1): void {
  let cx = x
  for (let i = 0; i < word.length; i++) {
    const ch = word.charAt(i)
    const glyph = ch === ' ' ? undefined : FONT[ch]
    if (glyph) {
      for (let ry = 0; ry < glyph.length; ry++) {
        const row = glyph[ry] ?? ''
        for (let rx = 0; rx < row.length; rx++) {
          if (row.charAt(rx) === '1') px(ctx, color, cx + rx * scale, y + ry * scale, scale, scale)
        }
      }
    }
    cx += (ch === ' ' ? 3 : 5) * scale
    if (i < word.length - 1) cx += scale
  }
}

type DocKind = 'act' | 'ban' | 'bill' | 'cap' | 'law'

function drawDoc(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  kind: DocKind,
  time: number,
  phase: number,
  still = false,
): void {
  const spec = {
    act: { word: 'ACT', seal: MAGENTA, w: 24, h: 30, scale: 1 },
    ban: { word: 'BAN', seal: CYAN, w: 24, h: 28, scale: 1 },
    bill: { word: 'BILL', seal: GOLD, w: 32, h: 34, scale: 1 },
    cap: { word: 'CAP', seal: RED, w: 24, h: 26, scale: 1 },
    law: { word: 'LAW', seal: MAGENTA, w: 52, h: 62, scale: 2 },
  }[kind]
  const bob = still ? 0 : Math.sin(time * 1.8 + phase) > 0 ? 1 : 0
  const yy = y + bob
  const header = 7 * spec.scale + 2
  px(ctx, '#120c08', x + 1, yy + 2, spec.w, spec.h)
  px(ctx, PAPER, x, yy, spec.w, spec.h)
  px(ctx, spec.seal, x, yy, spec.w, header)
  const ink = spec.seal === GOLD || spec.seal === CYAN ? INK : PAPER
  say(ctx, spec.word, x + (((spec.w - textWidth(spec.word, spec.scale)) / 2) | 0), yy + 1, ink, spec.scale)
  const lines = kind === 'ban' || kind === 'cap' ? 2 : 3
  for (let i = 0; i < lines; i++) {
    px(ctx, '#5c574c', x + 3, yy + header + 3 + i * 4, spec.w - 8 - (i % 2) * 5, 1)
  }
  if (kind === 'act' || kind === 'law') {
    px(ctx, '#e4dcc8', x + spec.w - 5, yy + header, 5, 1)
    px(ctx, '#e4dcc8', x + spec.w - 4, yy + header + 1, 4, 1)
    px(ctx, '#e4dcc8', x + spec.w - 3, yy + header + 2, 3, 1)
    px(ctx, '#c8b89a', x + spec.w - 5, yy + header, 1, 4)
  } else if (kind === 'ban') {
    px(ctx, spec.seal, x, yy + header, 3, spec.h - header)
  } else if (kind === 'bill') {
    px(ctx, spec.seal, x + 3, yy + header + 1, spec.w - 6, 1)
    px(ctx, spec.seal, x + 3, yy + header + 3, spec.w - 6, 1)
  } else {
    px(ctx, spec.seal, x, yy + spec.h - 4, spec.w, 4)
  }
  const sx = kind === 'bill' ? x + 8 : kind === 'ban' ? x + ((spec.w / 2) | 0) : x + spec.w - 8
  const sy = yy + spec.h - (kind === 'law' ? 12 : 9)
  disc(ctx, spec.seal, sx, sy, kind === 'law' ? 5 : 3)
  disc(ctx, kind === 'cap' ? GOLD_HOT : PAPER, sx, sy, 1)
  const sway = still ? 0 : Math.sin(time * 2.1 + phase)
  px(ctx, spec.seal, sx - 2, sy + 2, 2, sway > 0 ? 3 : 2)
  px(ctx, spec.seal, sx + 1, sy + 2, 2, sway > 0 ? 2 : 3)
}

function modelFigure(ctx: CanvasRenderingContext2D, x: number, y: number, time: number, slump: boolean): void {
  const bob = slump ? 0 : Math.sin(time * 1.3) > 0 ? 0 : 1
  dither(ctx, GOLD, x - 5, y - 3 + bob, 18, slump ? 14 : 20, 2)
  if (slump) {
    dither(ctx, GOLD, x - 1, y + 2, 16, 12, 2)
    disc(ctx, GOLD_HOT, x + 2, y + 4, 2)
    px(ctx, GOLD, x + 5, y + 5, 8, 3)
    px(ctx, GOLD, x + 11, y + 7, 3, 2)
    return
  }
  disc(ctx, GOLD, x + 4, y + 3 + bob, 3)
  disc(ctx, GOLD_HOT, x + 4, y + 2 + bob, 1)
  px(ctx, GOLD, x + 3, y + 7 + bob, 3, 6)
  px(ctx, GOLD_HOT, x + 4, y + 8 + bob, 1, 4)
  px(ctx, GOLD, x + 2, y + 13 + bob, 2, 3)
  px(ctx, GOLD, x + 5, y + 13 + bob, 2, 3)
}

function playerToken(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const bob = Math.sin(time * 1.6) > 0 ? 0 : 1
  disc(ctx, '#3a2808', x, y + 2 + bob, 7)
  disc(ctx, GOLD, x, y + bob, 6)
  disc(ctx, GOLD_HOT, x - 2, y - 2 + bob, 3)
  px(ctx, PAPER, x + 5, y - 1 + bob, 4, 3)
  px(ctx, PAPER, x + 9, y + bob, 3, 1)
}

function chip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  px(ctx, '#3a2808', x, y + 1, w, h)
  px(ctx, GOLD, x, y, w, h)
  px(ctx, GOLD_HOT, x, y, w, 1)
  px(ctx, '#7a5810', x, y + h - 1, w, 1)
  if (w > 6) px(ctx, PAPER, x + 2, y + 2, Math.max(2, (w / 3) | 0), 1)
}

function shutDoor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  px(ctx, '#3a2014', x, y, w, h)
  px(ctx, WOOD, x + 2, y + 2, w - 4, h - 4)
  px(ctx, '#c8a070', x + 2, y + 2, w - 4, 2)
  px(ctx, '#2a160e', x + w - 8, y + ((h / 2) | 0), 3, 3)
}

function openDoor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  px(ctx, '#4a3018', x, y, w, 3)
  px(ctx, '#4a3018', x, y, 3, h)
  px(ctx, '#4a3018', x + w - 3, y, 3, h)
  px(ctx, '#120c08', x + 3, y + 3, w - 6, h - 3)
  dither(ctx, GOLD, x + 6, y + 10, Math.max(4, w - 14), Math.max(4, h - 18), 3)
}

function rack(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number, seed: number): void {
  px(ctx, '#0c1424', x, y, w, h)
  px(ctx, '#3a5080', x, y, w, 2)
  px(ctx, '#050810', x, y, 2, h)
  const rows = Math.max(3, Math.floor((h - 8) / 6))
  for (let i = 0; i < rows; i++) {
    const wave = Math.sin(time * 0.85 + seed * 0.7 + i * 0.55)
    const color = wave > 0.35 ? GOLD_HOT : wave > -0.35 ? CYAN : GOLD
    px(ctx, '#080c14', x + 4, y + 4 + i * 6, Math.max(2, w - 8), 4)
    px(ctx, color, x + 5, y + 5 + i * 6, Math.max(2, w - 10), 2)
  }
}

function miniDoc(ctx: CanvasRenderingContext2D, x: number, y: number, seal: string, time: number, phase: number): void {
  const bob = Math.sin(time * 1.6 + phase) > 0 ? 0 : 1
  px(ctx, PAPER, x, y + bob, 8, 11)
  px(ctx, '#6a6458', x + 1, y + 2 + bob, 5, 1)
  px(ctx, '#6a6458', x + 1, y + 4 + bob, 4, 1)
  px(ctx, '#6a6458', x + 1, y + 6 + bob, 5, 1)
  disc(ctx, seal, x + 5, y + 8 + bob, 2)
}

function sit(ctx: CanvasRenderingContext2D, x: number, y: number, coat: string): void {
  px(ctx, '#f0d2b0', x + 3, y, 6, 5)
  px(ctx, INK, x + 3, y, 6, 2)
  px(ctx, coat, x, y + 5, 12, 9)
  px(ctx, coat, x + 1, y + 14, 4, 4)
  px(ctx, coat, x + 7, y + 14, 4, 4)
}

function plant(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  px(ctx, WOOD, x + 3, y + 7, 6, 5)
  disc(ctx, LAWN, x + 6, y + 5, 5)
  disc(ctx, '#2f9a52', x + 4, y + 4, 3)
}

function anchor(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const nod = Math.sin(time * 0.55) > 0.92 ? 1 : 0
  px(ctx, '#e8c8a8', x + 5, y + nod, 12, 9)
  px(ctx, '#2a1c14', x + 4, y + nod, 14, 3)
  px(ctx, INK, x + 7, y + 4 + nod, 2, 2)
  px(ctx, INK, x + 12, y + 4 + nod, 2, 2)
  px(ctx, '#1a2848', x, y + 9 + nod, 22, 14)
  px(ctx, PAPER, x + 9, y + 10 + nod, 4, 9)
  px(ctx, RED, x + 10, y + 10 + nod, 2, 6)
}

function chyron(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, word: string): void {
  px(ctx, '#061018', x, y, w, 12)
  px(ctx, CYAN, x, y, 3, 12)
  say(ctx, word, x + 6, y + 2, PAPER, 1)
}

function setTv(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
  scan: string,
  paint: (sx: number, sy: number, sw: number, sh: number) => void,
): void {
  px(ctx, WOOD, x, y, w, h)
  px(ctx, '#c4a070', x, y, w, 2)
  px(ctx, '#2a180e', x, y + h - 4, w, 4)
  const sx = x + 4
  const sy = y + 4
  const sw = w - 8
  const sh = h - 12
  paint(sx, sy, sw, sh)
  const line = Math.floor((time * 5) % Math.max(1, sh - 1))
  px(ctx, scan, sx, sy + line, sw, 1)
}

function powerSwitch(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  px(ctx, GOLD_HOT, x + 4, y - 6, 4, 4)
  px(ctx, '#d8d4cc', x, y, 12, 18)
  px(ctx, '#2a2a2a', x + 5, y + 3, 2, 8)
  px(ctx, GOLD, x + 3, y + 2, 6, 3)
}

function hand(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  px(ctx, '#e8c8a8', x, y, 7, 5)
  px(ctx, '#f0d2b0', x + 1, y - 3, 2, 3)
  px(ctx, '#f0d2b0', x + 3, y - 4, 2, 4)
  px(ctx, '#e0b898', x + 5, y - 2, 2, 3)
}

function redStamp(ctx: CanvasRenderingContext2D, x: number, y: number, word: string, scale = 2): void {
  const w = textWidth(word, scale) + 8
  const h = 7 * scale + 6
  px(ctx, RED, x, y, w, 2)
  px(ctx, RED, x, y + h - 2, w, 2)
  px(ctx, RED, x, y, 2, h)
  px(ctx, RED, x + w - 2, y, 2, h)
  say(ctx, word, x + 4, y + 3, RED, scale)
}

function dropStamp(ctx: CanvasRenderingContext2D, x: number, y: number, word: string): void {
  const w = textWidth(word, 2) + 12
  const h = 24
  px(ctx, '#6a1020', x + 2, y + 2, w, h)
  px(ctx, RED, x, y, w, h)
  px(ctx, '#ffd6da', x + 3, y + 3, w - 6, h - 6)
  say(ctx, word, x + 6, y + 5, RED, 2)
}

const GROUND = 104

const BLOCKS: Array<{ x: number; y: number; w: number; h: number; body: string; roof: number }> = [
  { x: 2, y: 58, w: 28, h: 46, body: '#120c1c', roof: 1 },
  { x: 32, y: 72, w: 18, h: 32, body: '#1a1230', roof: 0 },
  { x: 52, y: 42, w: 36, h: 62, body: '#0e0a16', roof: 2 },
  { x: 90, y: 64, w: 20, h: 40, body: BRICK, roof: 0 },
  { x: 112, y: 50, w: 22, h: 54, body: '#160e24', roof: 1 },
  { x: 136, y: 74, w: 16, h: 30, body: '#221430', roof: 0 },
  { x: 154, y: 36, w: 36, h: 68, body: '#0c0814', roof: 2 },
  { x: 192, y: 56, w: 22, h: 48, body: '#1a1028', roof: 1 },
  { x: 216, y: 46, w: 22, h: 58, body: '#100c18', roof: 0 },
  { x: 238, y: 66, w: 16, h: 38, body: '#1c1430', roof: 0 },
]

const PANES: Array<readonly [number, number]> = [
  [6, 66],
  [6, 82],
  [16, 66],
  [36, 80],
  [58, 50],
  [58, 68],
  [64, 86],
  [72, 68],
  [96, 72],
  [96, 88],
  [118, 58],
  [118, 76],
  [140, 82],
  [160, 44],
  [160, 62],
  [174, 44],
  [174, 62],
  [198, 64],
  [198, 82],
  [206, 74],
  [222, 54],
  [222, 72],
  [242, 74],
  [242, 90],
]

const LAMPS = [22, 78, 132, 186, 230]
const DUSK = ['#140818', '#2a1844', '#4a3068', '#8a5070', '#e09058', '#ffc090']
const DEAD = ['#05030a', '#05030a', '#07040f', '#08060e', '#0a0810', '#0c0a12']

type SkyMode = 'city' | 'evening' | 'blackout'

function paneOn(index: number, time: number, mode: SkyMode): boolean {
  if (mode === 'evening') return true
  if (mode === 'city') {
    if (hash(index, 11) % 4 !== 0) return true
    const period = 2.8 + (hash(index, 12) % 4) * 0.45
    const phase = (hash(index, 13) % 100) / 100
    return (time / period + phase) % 1 > 0.22
  }
  const death = 0.4 + (index / Math.max(1, PANES.length - 1)) * 6.2
  return time < death
}

function lampOn(index: number, time: number, mode: SkyMode): boolean {
  if (mode !== 'blackout') return true
  return time < 6.75 + index * 0.26
}

function streetLamp(ctx: CanvasRenderingContext2D, x: number, on: boolean, time: number, fade: number): void {
  const pole = mix('#3a3444', INK, fade)
  const head = GROUND + 2
  px(ctx, pole, x, head, 2, 18)
  px(ctx, pole, x - 5, head, 12, 2)
  if (!on) {
    px(ctx, mix('#2a261c', INK, fade), x - 1, head - 1, 4, 3)
    return
  }
  const hot = Math.sin(time * 0.6 + x * 0.05) > 0
  disc(ctx, hot ? GOLD_HOT : GOLD, x + 1, head + 1, 3)
  dither(ctx, '#ffb060', x - 6, head - 3, 14, 10, 3)
}

function drawSkyline(ctx: CanvasRenderingContext2D, time: number, mode: SkyMode): void {
  const skyT = mode === 'blackout' ? clamp((time - 3.5) / 4.5, 0, 1) : 0
  const bodyT = mode === 'blackout' ? clamp((time - 6) / 2, 0, 1) : 0
  const streetT = mode === 'blackout' ? clamp((time - 6.6) / 1.4, 0, 1) : 0
  bands(
    ctx,
    DUSK.map((color, i) => mix(color, DEAD[i] ?? INK, skyT)),
    0,
    GROUND,
  )
  if (skyT < 0.85) stars(ctx, 36, 32, mix(PAPER, INK, skyT), time)
  if (skyT < 0.9) {
    disc(ctx, mix('#d8d4ea', INK, skyT), 118, 20, 7)
    disc(ctx, mix(DUSK[1] ?? INK, INK, skyT), 115, 18, 6)
  }
  for (const block of BLOCKS) {
    const body = mix(block.body, '#100c16', bodyT)
    px(ctx, body, block.x, block.y, block.w, block.h)
    px(ctx, mix('#3a3058', '#100c16', bodyT), block.x, block.y, block.w, 2)
    if (block.roof === 1) {
      const ax = block.x + ((block.w / 2) | 0)
      px(ctx, mix('#2a2040', '#100c16', bodyT), ax, block.y - 10, 1, 10)
      px(ctx, mix(MAGENTA, '#100c16', bodyT), ax - 2, block.y - 12, 5, 2)
    } else if (block.roof === 2) {
      px(ctx, body, block.x + 4, block.y - 6, block.w - 8, 6)
      px(ctx, body, block.x + 8, block.y - 11, block.w - 16, 5)
    }
  }
  PANES.forEach((pane, index) => {
    const on = paneOn(index, time, mode)
    const color = on ? (hash(index, 4) % 6 === 0 ? CYAN : hash(index, 5) % 5 === 0 ? GOLD_HOT : GOLD) : mix('#100c18', INK, bodyT)
    px(ctx, color, pane[0], pane[1], 4, 4)
  })
  px(ctx, mix('#322838', INK, streetT), 0, GROUND, W, 8)
  px(ctx, mix('#14121c', INK, streetT), 0, GROUND + 8, W, H - GROUND - 8)
  if (streetT < 0.95) px(ctx, mix('#ffb060', INK, Math.max(skyT, streetT)), 0, GROUND, W, 1)
  for (let x = 16; x < W; x += 22) {
    if (streetT < 0.5) px(ctx, mix(GOLD, INK, streetT * 2), x, GROUND + 16, 8, 2)
  }
  const shops = [40, 96, 168]
  shops.forEach((x, i) => {
    const on = mode !== 'blackout' || time < 6.9 + i * 0.28
    px(ctx, on ? '#3a2818' : mix('#100c14', INK, streetT), x, GROUND + 8, 16, 6)
    if (on) px(ctx, GOLD, x + 2, GROUND + 9, 12, 3)
  })
  LAMPS.forEach((x, i) => streetLamp(ctx, x, lampOn(i, time, mode), time, streetT))
}

function singer(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const hip = Math.sin(time * 1.3) > 0 ? 1 : 0
  px(ctx, INK, x + 2, y, 8, 3)
  px(ctx, INK, x + 3, y + 3, 6, 4)
  px(ctx, INK, x + 4, y + 7, 4, 6)
  px(ctx, INK, x + hip, y + 8, 4, 2)
  px(ctx, INK, x + 7, y + 9, 3, 2)
  px(ctx, INK, x + 4, y + 13, 2, 5)
  px(ctx, INK, x + 7 + hip, y + 13, 2, 5)
  px(ctx, INK, x + 10, y + 7, 1, 5)
  px(ctx, INK, x + 9, y + 12, 3, 2)
}

function dancer(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const beat = Math.sin(time * 2.2)
  px(ctx, PAPER, x + 4, y, 5, 5)
  px(ctx, INK, x + 4, y, 5, 2)
  px(ctx, CYAN, x + 3, y + 5, 7, 7)
  px(ctx, PAPER, x + (beat > 0 ? -1 : 1), y + 5, 4, 2)
  px(ctx, PAPER, x + (beat > 0 ? 8 : 6), y + 4, 4, 2)
  px(ctx, INK, x + 4, y + 12, 2, beat > 0 ? 5 : 4)
  px(ctx, INK, x + 7, y + 12, 2, beat > 0 ? 4 : 5)
}

function netGraph(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const pts: Array<[number, number]> = [
    [4, 36],
    [16, 32],
    [28, 30],
    [40, 20],
    [52, 18],
    [66, 6],
  ]
  const grow = clamp(time / 3.5, 0, 1)
  const last = Math.max(1, Math.ceil(grow * (pts.length - 1)))
  for (let i = 0; i < last; i++) {
    const a = pts[i]!
    const b = pts[i + 1]!
    for (let s = 0; s <= 8; s++) {
      const u = s / 8
      px(ctx, CYAN, x + a[0] + (b[0] - a[0]) * u, y + a[1] + (b[1] - a[1]) * u, 2, 2)
    }
  }
  for (let i = 0; i <= last; i++) {
    const p = pts[i]!
    const leap = i === pts.length - 1 && grow >= 1 ? Math.sin(time * 1.3) * 2 : 0
    disc(ctx, i > 3 ? GOLD : PAPER, x + p[0], y + p[1] - leap, i === pts.length - 1 ? 3 : 2)
  }
}

function crowd(ctx: CanvasRenderingContext2D, x: number, y: number, cols: number, rows: number): void {
  const colors = [MAGENTA, CYAN, GOLD, PAPER, BRICK, '#1a2848']
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      disc(ctx, colors[(row * 3 + col) % colors.length] ?? PAPER, x + col * 6, y + row * 6, 2)
    }
  }
}

function oscar(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  disc(ctx, GOLD, x + 3, y + 3, 3)
  px(ctx, GOLD, x + 2, y + 7, 3, 8)
  px(ctx, GOLD_HOT, x + 3, y + 8, 1, 6)
  px(ctx, '#1a1a1a', x, y + 15, 8, 3)
}

function drawCity(ctx: CanvasRenderingContext2D, time: number): void {
  drawSkyline(ctx, time, 'city')
  modelFigure(ctx, 118, GROUND + 4, time, false)
  edge(ctx)
}

function researcher(ctx: CanvasRenderingContext2D, x: number, y: number, coat: string, time: number, phase: number): void {
  const bob = Math.sin(time * 1.1 + phase) > 0 ? 0 : 1
  px(ctx, '#f0d2b0', x + 2, y + bob, 7, 6)
  px(ctx, INK, x + 2, y + bob, 7, 2)
  px(ctx, coat, x, y + 6 + bob, 11, 10)
  px(ctx, PAPER, x + 4, y + 8 + bob, 3, 4)
}

function drawDartmouth(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#d9cbb0', 0, 0, W, 86)
  px(ctx, WOOD, 0, 86, W, H - 86)
  px(ctx, '#4a3018', 0, 86, W, 4)
  shutDoor(ctx, 8, 16, 32, 70)
  researcher(ctx, 48, 50, '#243044', time, 0.2)
  researcher(ctx, 72, 48, '#6a3030', time, 1.3)
  researcher(ctx, 98, 52, '#1a2848', time, 2.1)
  px(ctx, WOOD, 42, 68, 84, 12)
  px(ctx, '#4a3018', 48, 80, 4, 24)
  px(ctx, '#4a3018', 116, 80, 4, 24)
  px(ctx, PAPER, 52, 64, 14, 6)
  px(ctx, PAPER, 74, 62, 16, 8)
  plant(ctx, 108, 56)
  px(ctx, WOOD, 156, 8, 90, 46)
  px(ctx, '#163028', 160, 12, 82, 38)
  say(ctx, 'AI', 186, 22, PAPER, 2)
  px(ctx, '#c8d0c0', 172, 40, 28, 2)
  setTv(ctx, 150, 68, 96, 68, time, '#5c6a7c', (sx, sy, sw, sh) => {
    px(ctx, '#d5dbe6', sx, sy, sw, sh)
    singer(ctx, sx + 6, sy + 2, time)
    say(ctx, 'ELVIS', sx + 26, sy + 18, INK, 2)
  })
  for (let i = 0; i < 6; i++) {
    px(ctx, '#2a2418', 196 - i, 66 - i, 1, 1)
    px(ctx, '#2a2418', 196 + i, 66 - i, 1, 1)
  }
  edge(ctx)
}

function drawLab(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#12141c', 0, 0, W, H)
  px(ctx, '#1c2030', 0, 112, W, 32)
  px(ctx, PAPER, 8, 8, 58, 34)
  px(ctx, RED, 32, 6, 4, 4)
  say(ctx, '2012', 12, 16, INK, 2)
  px(ctx, '#1a1c24', 8, 48, 78, 60)
  px(ctx, '#071018', 12, 52, 70, 48)
  netGraph(ctx, 14, 56, time)
  px(ctx, '#1a1c24', 94, 28, 108, 80)
  px(ctx, '#101820', 98, 32, 100, 68)
  dancer(ctx, 108, 38, time)
  say(ctx, 'SONG', 128, 58, GOLD, 2)
  px(ctx, WOOD, 0, 112, W, 8)
  person(ctx, 214, 96, '#1a2848', time, 0.4)
  px(ctx, '#2a3148', 210, 78, 28, 18)
  px(ctx, CYAN, 214, 82, 20, 2)
  px(ctx, GOLD, 214, 86, 14, 2)
  edge(ctx)
}

function drawPaper(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#2a2434', 0, 0, W, H)
  px(ctx, '#3a3428', 0, 108, W, 36)
  const wx = 108
  const wy = 12
  px(ctx, '#0c1018', wx, wy, 136, 86)
  px(ctx, '#101828', wx + 4, wy + 4, 128, 40)
  px(ctx, '#0a0e16', wx + 10, wy + 16, 16, 28)
  px(ctx, '#141820', wx + 30, wy + 10, 20, 34)
  px(ctx, '#0a0e16', wx + 78, wy + 18, 18, 26)
  px(ctx, '#12161e', wx + 100, wy + 12, 24, 32)
  px(ctx, '#1c2430', wx + 4, wy + 44, 128, 8)
  px(ctx, '#0c1016', wx + 4, wy + 52, 128, 30)
  const pulse = Math.sin(time * 0.85)
  const lamp = pulse < -0.88 ? '#5a4010' : pulse > 0 ? GOLD_HOT : GOLD
  px(ctx, '#222028', wx + 58, wy + 22, 2, 30)
  px(ctx, '#222028', wx + 52, wy + 22, 14, 2)
  disc(ctx, lamp, wx + 59, wy + 23, pulse < -0.88 ? 2 : 3)
  if (pulse >= -0.88) dither(ctx, '#ffb060', wx + 50, wy + 16, 18, 14, 3)
  px(ctx, WOOD, wx - 4, wy - 4, 144, 4)
  px(ctx, WOOD, wx - 4, wy, 4, 90)
  px(ctx, WOOD, wx + 132, wy, 8, 90)
  px(ctx, WOOD, wx - 4, wy + 86, 144, 4)
  shutDoor(ctx, 8, 14, 30, 72)
  setTv(ctx, 8, 92, 84, 46, time, '#9fd4ea', (sx, sy, sw, sh) => {
    px(ctx, '#102030', sx, sy, sw, sh)
    say(ctx, 'EMPTY', sx + 6, sy + 8, PAPER, 2)
  })
  px(ctx, '#efe8dc', 132, 70, 62, 8)
  px(ctx, '#e4dcc8', 128, 76, 66, 8)
  px(ctx, PAPER, 124, 82, 70, 28)
  px(ctx, '#d8d0c0', 124, 82, 70, 2)
  for (let i = 0; i < 4; i++) px(ctx, '#6a6458', 130, 88 + i * 4, 52 - (i % 2) * 10, 1)
  px(ctx, WOOD, 96, 100, 14, 4)
  px(ctx, WOOD, 98, 104, 3, 8)
  px(ctx, WOOD, 106, 104, 3, 8)
  const bob = Math.sin(time * 1.2) > 0 ? 0 : 1
  dither(ctx, GOLD, 98, 78 + bob, 12, 16, 3)
  disc(ctx, GOLD, 104, 82 + bob, 3)
  disc(ctx, GOLD_HOT, 104, 81 + bob, 1)
  px(ctx, GOLD, 102, 86 + bob, 4, 6)
  px(ctx, GOLD, 101, 92 + bob, 2, 3)
  px(ctx, GOLD, 105, 92 + bob, 2, 3)
  edge(ctx)
}

function drawHalls(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#070a12', 0, 0, W, H)
  px(ctx, '#101828', 0, 0, W, 16)
  px(ctx, '#0c1018', 0, 108, W, 36)
  px(ctx, '#1a2438', 96, 108, 64, 2)
  rack(ctx, 4, 18, 38, 90, time, 1)
  rack(ctx, 46, 32, 26, 76, time, 2)
  rack(ctx, 76, 46, 16, 62, time, 3)
  rack(ctx, 164, 46, 16, 62, time, 4)
  rack(ctx, 184, 32, 26, 76, time, 5)
  rack(ctx, 214, 18, 38, 90, time, 6)
  const seals = [MAGENTA, CYAN, GOLD, RED]
  seals.forEach((seal, i) => miniDoc(ctx, 104 + i * 12, 78, seal, time, i * 0.8))
  chip(ctx, 18, 120, 6, 4)
  chip(ctx, 36, 128, 5, 3)
  chip(ctx, 58, 118, 8, 5)
  chip(ctx, 188, 122, 6, 4)
  chip(ctx, 210, 130, 10, 6)
  chip(ctx, 78, 124, 14, 8)
  modelFigure(ctx, 118, 96, time, false)
  edge(ctx)
}

function drawManual(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, INK, 0, 0, W, H)
  px(ctx, '#2c1c58', 6, 8, 244, 128)
  px(ctx, '#100818', 12, 14, 232, 116)
  px(ctx, '#6c5cc0', 12, 14, 232, 2)
  px(ctx, '#2c1c58', 12, 64, 148, 10)
  px(ctx, '#6c5cc0', 12, 64, 148, 2)
  px(ctx, '#2c1c58', 78, 14, 10, 50)
  chip(ctx, 24, 28, 6, 5)
  chip(ctx, 44, 42, 6, 5)
  chip(ctx, 26, 48, 6, 5)
  chip(ctx, 104, 24, 6, 5)
  chip(ctx, 122, 40, 6, 5)
  chip(ctx, 168, 26, 22, 14)
  drawDoc(ctx, 18, 96, 'act', time, 0)
  drawDoc(ctx, 52, 98, 'ban', time, 1.2)
  drawDoc(ctx, 90, 90, 'bill', time, 2.3)
  drawDoc(ctx, 136, 100, 'cap', time, 3.4)
  playerToken(ctx, 214, 108, time)
  edge(ctx)
}

function drawKitchen(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#3a2848', 0, 0, W, H)
  px(ctx, WOOD, 0, 0, W, 28)
  px(ctx, '#4a2818', 8, 6, 40, 16)
  px(ctx, '#4a2818', 54, 6, 40, 16)
  disc(ctx, GOLD_HOT, 36, 18, 4)
  dither(ctx, '#ffb060', 16, 8, 40, 24, 3)
  px(ctx, '#101820', 188, 8, 28, 22)
  px(ctx, WOOD, 186, 6, 32, 2)
  disc(ctx, '#f4f0e6', 202, 16, 4)
  const lit = clamp(time / 0.8, 0, 1)
  const glow = 0.55 + 0.45 * lit * (0.75 + 0.25 * Math.sin(time * 1.3))
  px(ctx, '#141018', 16, 78, 18, 30)
  px(ctx, mix('#062028', CYAN, glow), 18, 80, 14, 22)
  const open = clamp(time / 1.4, 0, 1)
  const bw = 8 + open * 26
  const bh = 8 + open * 12
  px(ctx, PAPER, 38, 70, bw, bh)
  px(ctx, PAPER, 36, 74, 4, 6)
  if (open > 0.8) {
    px(ctx, CYAN, 44, 76, 3, 3)
    px(ctx, CYAN, 50, 76, 3, 3)
    px(ctx, CYAN, 56, 76, 3, 3)
  }
  person(ctx, 48, 92, '#1a2848', time, 0.3)
  setTv(ctx, 78, 34, 108, 74, time, '#9fd4ea', (sx, sy, sw, sh) => {
    px(ctx, '#16304c', sx, sy, sw, sh)
    px(ctx, WOOD, sx + 10, sy + sh - 28, sw - 20, 8)
    anchor(ctx, sx + 18, sy + 6, time)
    chyron(ctx, sx, sy + sh - 14, sw, 'NOV 30')
  })
  px(ctx, '#10141c', 196, 40, 52, 44)
  px(ctx, '#1a2840', 199, 43, 46, 38)
  crowd(ctx, 206, 50, 6, 3)
  say(ctx, 'CUP', 204, 68, PAPER, 1)
  px(ctx, '#c4a070', 0, 116, W, 8)
  px(ctx, WOOD, 0, 124, W, 20)
  edge(ctx)
}

function drawShip(ctx: CanvasRenderingContext2D, time: number): void {
  bands(ctx, ['#100818', '#1c1240', '#302848'], 0, 78)
  stars(ctx, 24, 36, PAPER, time)
  px(ctx, '#1a181c', 0, 78, W, 66)
  px(ctx, '#2a3038', 0, 78, W, 4)
  px(ctx, '#1a1c24', 8, 16, 92, 70)
  px(ctx, '#071018', 12, 20, 84, 54)
  px(ctx, '#123040', 20, 28, 28, 28)
  px(ctx, GOLD, 58, 30, 28, 24)
  px(ctx, INK, 64, 36, 16, 12)
  const load = clamp(time / 4, 0, 1)
  px(ctx, '#0c1c24', 18, 60, 70, 6)
  px(ctx, CYAN, 18, 60, 70 * load, 6)
  if (Math.floor(time * 0.8) % 2 === 0) px(ctx, PAPER, 20 + 70 * load, 60, 2, 6)
  px(ctx, '#8a6840', 168, 36, 72, 58)
  px(ctx, '#6a4c30', 168, 36, 72, 4)
  px(ctx, '#6a4c30', 168, 36, 4, 58)
  px(ctx, WOOD, 176, 48, 56, 3)
  px(ctx, WOOD, 176, 60, 56, 3)
  px(ctx, '#a87848', 148, 62, 22, 28)
  px(ctx, PAPER, 16, 86, 140, 50)
  px(ctx, '#e4dcc8', 16, 86, 140, 3)
  for (let i = 0; i < 3; i++) px(ctx, '#6a6458', 24, 108 + i * 4, 70, 1)
  say(ctx, 'PRIZE', 24, 92, INK, 2)
  oscar(ctx, 112, 90)
  say(ctx, 'MAR 14', 24, 124, '#5c574c', 1)
  edge(ctx)
}

function drawOrder(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#1a2438', 0, 0, W, H)
  px(ctx, '#121a28', 0, 100, W, 44)
  px(ctx, WOOD, 0, 86, W, 16)
  px(ctx, '#8a5a38', 0, 86, W, 3)
  setTv(ctx, 150, 6, 98, 70, time, '#9fd4ea', (sx, sy, sw, sh) => {
    px(ctx, '#16304c', sx, sy, sw, sh)
    px(ctx, WOOD, sx + 16, sy + 28, 52, 6)
    anchor(ctx, sx + 28, sy + 8, time)
    chyron(ctx, sx, sy + sh - 14, sw, 'OCT 30')
  })
  px(ctx, '#efe8dc', 18, 18, 78, 8)
  px(ctx, PAPER, 14, 24, 86, 64)
  for (let i = 0; i < 6; i++) px(ctx, '#6a6458', 22, 36 + i * 6, 60 - (i % 3) * 8, 2)
  px(ctx, INK, 24, 70, 28, 2)
  px(ctx, INK, 30, 66, 18, 2)
  px(ctx, INK, 40, 72, 16, 2)
  disc(ctx, GOLD, 84, 70, 6)
  disc(ctx, RED, 84, 70, 3)
  const ease = clamp(time / 3, 0, 1)
  const u = ease * ease * (3 - 2 * ease)
  const hop = (x0: number, y0: number, x1: number, y1: number): [number, number] => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]
  const act = hop(22, 40, 8, 108)
  const ban = hop(48, 36, 44, 110)
  const bill = hop(34, 50, 84, 104)
  drawDoc(ctx, act[0], act[1], 'act', time, 0.2)
  drawDoc(ctx, ban[0], ban[1], 'ban', time, 1.3)
  drawDoc(ctx, bill[0], bill[1], 'bill', time, 2.4)
  edge(ctx)
}

function drawVeto(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#243044', 0, 0, W, 90)
  px(ctx, '#c8b49a', 0, 90, W, 54)
  px(ctx, WOOD, 0, 78, 170, 18)
  px(ctx, PAPER, 10, 8, 48, 62)
  px(ctx, RED, 10, 8, 48, 12)
  say(ctx, 'NOV', 18, 10, PAPER, 1)
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) px(ctx, '#6a6458', 16 + col * 8, 26 + row * 7, 4, 4)
  }
  disc(ctx, RED, 16 + 24 + 2, 26 + 14 + 2, 4)
  say(ctx, 'VOTE', 16, 56, INK, 1)
  px(ctx, '#c8c2b4', 64, 40, 96, 40)
  for (let i = 0; i < 4; i++) px(ctx, '#7a7468', 72, 48 + i * 5, 70 - (i % 2) * 16, 1)
  redStamp(ctx, 78, 58, 'VETO', 2)
  person(ctx, 146, 66, '#1a2848', time, 0.4)
  px(ctx, '#1a2430', 164, 18, 86, 114)
  px(ctx, WOOD, 164, 18, 86, 4)
  px(ctx, WOOD, 164, 18, 4, 114)
  px(ctx, WOOD, 246, 18, 4, 114)
  drawDoc(ctx, 170, 104, 'act', time, 0.4)
  drawDoc(ctx, 194, 106, 'ban', time, 1.5)
  drawDoc(ctx, 216, 100, 'bill', time, 2.6)
  edge(ctx)
}

function drawWeights(ctx: CanvasRenderingContext2D, time: number): void {
  bands(ctx, ['#6aa4d8', '#8ec4ea', '#d8e8f4', '#f4e6d0'], 0, 100)
  px(ctx, '#b7a48c', 0, 100, W, 44)
  px(ctx, '#8a7a64', 0, 100, W, 3)
  px(ctx, '#d8d4cc', 70, 70, 64, 40)
  px(ctx, '#8a8680', 70, 70, 64, 4)
  say(ctx, 'OATH', 76, 78, INK, 2)
  say(ctx, 'JAN 20', 82, 98, '#3a3840', 1)
  person(ctx, 92, 56, '#1a2848', time, 0.2)
  for (let i = 0; i < 8; i++) person(ctx, 4 + i * 14, 112, i % 2 ? '#243044' : '#6a3030', time, i * 0.4)
  for (let i = 0; i < 4; i++) person(ctx, 120 + i * 14, 116, i % 2 ? PAPER : '#1a2848', time, i)
  px(ctx, '#c8c4bc', 196, 28, 56, 90)
  px(ctx, '#8a8680', 196, 28, 56, 3)
  openDoor(ctx, 210, 48, 28, 70)
  for (let i = 0; i < 6; i++) {
    const u = (time * 0.16 + i * 0.17) % 1
    const sx = 230 - u * 210
    const sy = 24 + (i % 3) * 14 + u * 28
    px(ctx, PAPER, sx, sy, 12, 8)
    px(ctx, '#6a6458', sx + 2, sy + 2, 8, 1)
    px(ctx, '#6a6458', sx + 2, sy + 4, 6, 1)
  }
  edge(ctx)
}

function drawWire(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#1c2838', 0, 0, W, H)
  px(ctx, '#121a24', 0, 96, W, 48)
  px(ctx, WOOD, 28, 78, 150, 14)
  px(ctx, '#8a5a38', 28, 78, 150, 3)
  anchor(ctx, 70, 40, time)
  person(ctx, 18, 80, '#243044', time, 0.6)
  const drift = Math.sin(time * 0.45) * 8
  px(ctx, '#061018', 0, 118, W, 26)
  px(ctx, CYAN, 0, 118, W, 2)
  say(ctx, 'OPEN', 16 + drift, 122, PAPER, 2)
  say(ctx, 'NOV 13', 130 + drift, 126, GOLD, 1)
  const lift = Math.sin(time * 0.6) * 3
  px(ctx, '#d8d0c0', 176, 70, 68, 40)
  px(ctx, PAPER, 180, 60 + lift, 64, 36)
  px(ctx, '#e4dcc8', 180, 60 + lift, 64, 2)
  say(ctx, 'MODEL', 186, 68 + lift, INK, 1)
  px(ctx, '#6a6458', 186, 80 + lift, 48, 1)
  px(ctx, '#6a6458', 186, 84 + lift, 40, 1)
  px(ctx, '#6a6458', 186, 88 + lift, 44, 1)
  edge(ctx)
}

function coatWalker(ctx: CanvasRenderingContext2D, x: number, y: number, coat: string, time: number, phase: number): void {
  const step = Math.sin(time * 2 + phase) > 0 ? 1 : 0
  px(ctx, '#f0d2b0', x + 3, y, 6, 5)
  px(ctx, INK, x + 3, y, 6, 2)
  px(ctx, coat, x, y + 5, 12, 11)
  px(ctx, '#241c14', x + 2, y + 16, 3, 5 + step)
  px(ctx, '#241c14', x + 7, y + 16, 3, 6 - step)
}

function drawLeave(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#070a12', 0, 0, W, H)
  px(ctx, '#101828', 0, 0, W, 14)
  px(ctx, '#141a24', 0, 112, W, 32)
  rack(ctx, 4, 16, 44, 96, time, 1)
  rack(ctx, 214, 16, 38, 96, time, 2)
  openDoor(ctx, 168, 36, 36, 76)
  px(ctx, GOLD, 170, 20, 32, 12)
  say(ctx, 'EXIT', 174, 23, INK, 1)
  powerSwitch(ctx, 50, 74)
  const gone = Math.max(0, time - 2.2)
  const sway = gone > 0 ? 0 : Math.sin(time * 1.15) * 2
  const walker = Math.min(146, 64 + sway + gone * 24)
  coatWalker(ctx, 8 + time * 8, 90, '#d8d0c4', time, 0.2)
  coatWalker(ctx, 28 + time * 7, 90, '#243044', time, 1.4)
  coatWalker(ctx, 16 + time * 6, 90, '#6a3830', time, 2.2)
  coatWalker(ctx, walker, 90, '#c8c0b0', time, 0.6)
  if (gone === 0) {
    px(ctx, '#c8c0b0', walker + 10, 82, 2, 12)
    hand(ctx, 66 + sway, 76)
  } else {
    hand(ctx, walker + 11, 102)
  }
  edge(ctx)
}

function drawBlackout(ctx: CanvasRenderingContext2D, time: number): void {
  drawSkyline(ctx, time, 'blackout')
  edge(ctx)
}

function drawCaught(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#161222', 0, 0, W, H)
  px(ctx, '#241c30', 0, 0, W, 28)
  px(ctx, '#2a2434', 0, 118, W, 26)
  px(ctx, '#3a3444', 0, 116, W, 2)
  const u = clamp(time / 1.5, 0, 1)
  const ease = u * u * (3 - 2 * u)
  const reached = time >= 1.5
  const lx = 8 + ease * 96
  drawDoc(ctx, lx, 40, 'law', time, 0, reached)
  modelFigure(ctx, 150, reached ? 90 : 74, time, reached)
  if (time > 1.6) {
    const drop = clamp((time - 1.6) / 0.5, 0, 1)
    dropStamp(ctx, 176, 12 + drop * 90, 'HELD')
  }
  edge(ctx)
}

function drawEvening(ctx: CanvasRenderingContext2D, time: number): void {
  drawSkyline(ctx, time, 'evening')
  px(ctx, WOOD, 8, 112, 96, 18)
  px(ctx, '#8a5a38', 8, 112, 96, 2)
  px(ctx, PAPER, 18, 108, 8, 4)
  px(ctx, PAPER, 40, 108, 8, 4)
  disc(ctx, '#c45a48', 64, 110, 3)
  plant(ctx, 78, 100)
  sit(ctx, 16, 96, '#6a3030')
  sit(ctx, 42, 98, '#1a2848')
  const walk = Math.min(time, 7) * 9
  drawDoc(ctx, 132 + walk, 108, 'act', time, 0.5, time > 7)
  edge(ctx)
}

export function drawComic(ctx: CanvasRenderingContext2D, scene: SceneId, time = 0): void {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.imageSmoothingEnabled = false
  ctx.setTransform(4, 0, 0, 4, 0, 0)
  const id = scene as string
  if (id === 'city') drawCity(ctx, time)
  else if (id === 'dartmouth') drawDartmouth(ctx, time)
  else if (id === 'lab') drawLab(ctx, time)
  else if (id === 'paper') drawPaper(ctx, time)
  else if (id === 'halls') drawHalls(ctx, time)
  else if (id === 'manual') drawManual(ctx, time)
  else if (id === 'kitchen') drawKitchen(ctx, time)
  else if (id === 'ship') drawShip(ctx, time)
  else if (id === 'order') drawOrder(ctx, time)
  else if (id === 'veto') drawVeto(ctx, time)
  else if (id === 'weights') drawWeights(ctx, time)
  else if (id === 'wire') drawWire(ctx, time)
  else if (id === 'leave') drawLeave(ctx, time)
  else if (id === 'blackout') drawBlackout(ctx, time)
  else if (id === 'caught') drawCaught(ctx, time)
  else if (id === 'evening') drawEvening(ctx, time)
  else {
    px(ctx, INK, 0, 0, W, H)
    edge(ctx)
  }
  ctx.restore()
}
