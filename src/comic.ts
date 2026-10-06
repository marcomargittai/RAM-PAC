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

interface Tower {
  x: number
  w: number
  h: number
  body: string
  win: string
  roof: 'flat' | 'ant' | 'step' | 'spire'
}

function tower(ctx: CanvasRenderingContext2D, b: Tower, ground: number, time: number, lit = 1): void {
  const top = ground - b.h
  px(ctx, b.body, b.x, top, b.w, b.h)
  px(ctx, '#05030a', b.x, ground - 2, b.w, 2)
  px(ctx, '#3a3050', b.x, top, b.w, 2)
  const accent = lit > 0.2
  if (b.roof === 'ant') {
    const ax = b.x + ((b.w / 2) | 0)
    px(ctx, '#2a2040', ax, top - 14, 2, 14)
    px(ctx, accent ? MAGENTA : '#140810', ax - 2, top - 16, 6, 2)
    px(ctx, accent ? CYAN : '#0c1218', ax - 1, top - 8, 4, 1)
  } else if (b.roof === 'step') {
    px(ctx, b.body, b.x + 3, top - 6, b.w - 6, 6)
    px(ctx, b.body, b.x + 7, top - 12, b.w - 14, 6)
  } else if (b.roof === 'spire') {
    px(ctx, accent ? PAPER : '#16141c', b.x + ((b.w / 2) | 0) - 1, top - 16, 3, 16)
    px(ctx, accent ? GOLD : '#2a1c08', b.x + ((b.w / 2) | 0), top - 18, 1, 2)
  }
  for (let wy = top + 6; wy < ground - 5; wy += 7) {
    for (let wx = b.x + 3; wx < b.x + b.w - 4; wx += 6) {
      const flicker = hash(wx, wy) % 17 === Math.floor(time * 2) % 17
      const on = lit > 0 && hash(wx, wy) % 1000 < lit * 1000 && hash(wx, wy) % 5 !== 0 && !flicker
      px(ctx, on ? b.win : '#08060e', wx, wy, 3, 3)
      if (on && hash(wx, wy) % 4 === 0) px(ctx, GOLD_HOT, wx, wy, 1, 1)
    }
  }
}

function cityBase(ctx: CanvasRenderingContext2D, time: number, evening: boolean, crowd = true): void {
  if (evening) {
    bands(ctx, ['#070814', '#101428', '#1a2048', '#243058', '#3a3868', '#6a5078'], 0, 86)
    stars(ctx, 48, 50, PAPER, time)
    disc(ctx, '#f4f0e6', 196, 28, 8)
    disc(ctx, '#1a2048', 193, 26, 7)
    dither(ctx, '#c8c0e0', 188, 20, 16, 16, 3)
  } else {
    bands(ctx, ['#140818', '#241030', '#4a1840', '#8a2838', '#e05830', '#ff9850', '#ffd090'], 0, 86)
    disc(ctx, '#ffd090', 188, 58, 16)
    disc(ctx, GOLD_HOT, 188, 58, 10)
    disc(ctx, PAPER, 188, 58, 5)
    dither(ctx, '#ffb060', 168, 42, 40, 32, 3)
    for (let i = 0; i < 4; i++) {
      const x = 20 + i * 36 + Math.sin(time + i) * 4
      const y = 16 + (i % 3) * 6
      px(ctx, INK, x, y, 4, 1)
      px(ctx, INK, x + 1, y + 1, 2, 1)
    }
  }

  px(ctx, evening ? '#241838' : '#3a2858', 0, 78, W, 16)
  px(ctx, evening ? '#140c22' : '#2a1840', 0, 86, 80, 10)
  px(ctx, evening ? '#140c22' : '#2a1840', 150, 84, 106, 12)

  const ground = 118
  const towers: Tower[] = [
    { x: 2, w: 26, h: 62, body: '#120c1c', win: GOLD, roof: 'ant' },
    { x: 30, w: 16, h: 40, body: '#1a1230', win: CYAN, roof: 'flat' },
    { x: 48, w: 34, h: 78, body: '#0e0a16', win: GOLD, roof: 'step' },
    { x: 84, w: 18, h: 48, body: '#221838', win: MAGENTA, roof: 'spire' },
    { x: 104, w: 22, h: 58, body: '#160e24', win: CYAN, roof: 'ant' },
    { x: 128, w: 14, h: 34, body: '#241430', win: GOLD, roof: 'flat' },
    { x: 144, w: 40, h: 86, body: '#0c0814', win: evening ? CYAN : GOLD, roof: 'step' },
    { x: 186, w: 20, h: 50, body: '#1a1028', win: MAGENTA, roof: 'ant' },
    { x: 208, w: 28, h: 70, body: '#100c18', win: GOLD, roof: 'spire' },
    { x: 238, w: 18, h: 44, body: '#1c1430', win: CYAN, roof: 'flat' },
  ]
  for (const item of towers) tower(ctx, item, ground, time)

  px(ctx, MAGENTA, 52, ground - 74, 10, 4)
  px(ctx, CYAN, 148, ground - 80, 14, 3)
  px(ctx, GOLD, 212, ground - 64, 8, 3)

  px(ctx, '#2a2438', 0, ground, W, 8)
  px(ctx, '#121018', 0, ground + 8, W, H - ground - 8)
  for (let x = 8; x < W; x += 18) px(ctx, GOLD, x, ground + 16, 8, 2)

  const carX = (40 + time * 18) % 220
  px(ctx, CYAN, carX, ground + 10, 22, 8)
  px(ctx, '#9eefff', carX + 4, ground + 11, 6, 4)
  px(ctx, GOLD_HOT, carX + 20, ground + 12, 3, 2)
  px(ctx, INK, carX + 2, ground + 16, 4, 3)
  px(ctx, INK, carX + 15, ground + 16, 4, 3)

  const car2 = 180 - ((time * 12) % 140)
  px(ctx, MAGENTA, car2, ground + 4, 18, 7)
  px(ctx, GOLD_HOT, car2 - 2, ground + 6, 3, 2)

  px(ctx, '#3a2848', 70, ground + 20, 36, 4)
  dither(ctx, evening ? CYAN : '#ffb060', 74, ground + 21, 28, 3, 2)

  if (crowd) {
    person(ctx, 18, ground - 14, '#c8b0e0', time, 0)
    person(ctx, 96, ground - 14, GOLD, time, 1.4)
    person(ctx, 230, ground - 14, CYAN, time, 2.2)
  }
  edge(ctx)
}

function skyline(ctx: CanvasRenderingContext2D, time: number, living: boolean): void {
  if (living) {
    bands(ctx, ['#07040f', '#140818', '#3a1020', '#6a2810', '#c45a18', '#ffb000'], 0, 70)
    disc(ctx, GOLD, 128, 24, 18)
    disc(ctx, GOLD_HOT, 128, 24, 10)
    disc(ctx, PAPER, 128, 24, 4)
  } else {
    px(ctx, '#07040f', 0, 0, W, H)
    disc(ctx, '#2a1808', 128, 24, 10)
  }

  const ground = 72
  const body = living ? '#100818' : '#1c1430'
  const win = living ? GOLD : GOLD
  const towers: Tower[] = [
    { x: 4, w: 18, h: 26, body, win, roof: 'flat' },
    { x: 24, w: 22, h: 40, body, win, roof: 'step' },
    { x: 48, w: 16, h: 22, body, win, roof: 'flat' },
    { x: 66, w: 22, h: 34, body, win: living ? GOLD_HOT : GOLD, roof: 'flat' },
    { x: 168, w: 20, h: 32, body, win: living ? CYAN : GOLD, roof: 'flat' },
    { x: 190, w: 16, h: 22, body, win, roof: 'flat' },
    { x: 208, w: 26, h: 44, body, win: living ? CYAN : GOLD, roof: 'step' },
    { x: 236, w: 16, h: 24, body, win, roof: 'flat' },
  ]
  const lit = living ? 1 : 0
  for (const item of towers) tower(ctx, item, ground, time, lit)
  if (!living) {
    const embers: Array<[number, number]> = [
      [30, 48],
      [52, 40],
      [188, 46],
      [214, 38],
    ]
    embers.forEach((spot, i) => {
      if (time < 0.35 + i * 0.45) px(ctx, GOLD, spot[0], spot[1], 2, 2)
    })
  }
  px(ctx, living ? '#3a2208' : '#140c18', 0, ground, W, 3)
  px(ctx, living ? GOLD : '#2a1808', 0, ground, W, 1)
}

function model(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
  const breath = Math.sin(time * 1.4) > 0 ? 0 : 1
  px(ctx, '#0c0614', x + 8, y, 14, 12)
  px(ctx, '#0c0614', x, y + 12, 30, 10)
  px(ctx, '#0c0614', x + 5, y + 22, 20, 20 + breath)
  px(ctx, GOLD, x + 14, y + 14, 2, 26)
  px(ctx, PAPER, x + 11, y + 13, 8, 2)
  px(ctx, '#0c0614', x + 6, y + 42, 6, 12)
  px(ctx, '#0c0614', x + 18, y + 42, 6, 12)
}

function drawCity(ctx: CanvasRenderingContext2D, time: number): void {
  skyline(ctx, time, true)
  model(ctx, 112, 16, time)
  edge(ctx)
}

function drawEvening(ctx: CanvasRenderingContext2D, time: number): void {
  cityBase(ctx, time, true)
  px(ctx, GOLD, 154, 46, 3, 4)
  px(ctx, GOLD_HOT, 155, 47, 1, 2)
  edge(ctx)
}

function tree(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  px(ctx, '#5a3418', x - 1, y, 3, 16)
  disc(ctx, '#146b38', x, y - 2, r)
  disc(ctx, '#2f9a52', x - 2, y - 4, r - 3)
  dither(ctx, '#8fd48a', x - r, y - r, r * 2, r, 3)
}

function drawDartmouth(ctx: CanvasRenderingContext2D, time: number): void {
  bands(ctx, ['#67c4ff', '#8fd4ff', '#c6ecff', '#e8f7ff'], 0, 78)
  disc(ctx, PAPER, 40, 22, 10)
  disc(ctx, PAPER, 214, 18, 14)
  disc(ctx, PAPER, 228, 20, 8)
  disc(ctx, '#fff6d0', 210, 22, 7)
  px(ctx, LAWN, 0, 96, W, 48)
  dither(ctx, '#3aaa58', 0, 98, W, 40, 3)
  px(ctx, '#d8c8a0', 112, 108, 32, 36)

  const x = 58
  const y = 64
  px(ctx, BRICK, x, y, 140, 64)
  px(ctx, '#f4f0e6', x, y, 140, 3)
  for (let row = 0; row < 20; row++) {
    const half = 3 + row
    px(ctx, PAPER, 128 - half, y - 20 + row, half * 2, 1)
  }
  px(ctx, BRICK, 118, y - 32, 20, 14)
  px(ctx, PAPER, 122, y - 40, 12, 10)
  px(ctx, GOLD, 126, y - 46, 4, 6)
  px(ctx, '#203040', 124, y - 36, 8, 6)

  for (let i = 0; i < 6; i++) {
    const wx = x + 10 + i * 22
    px(ctx, PAPER, wx, y + 12, 12, 16)
    px(ctx, '#16324a', wx + 2, y + 14, 8, 12)
    px(ctx, GOLD_HOT, wx + 3, y + 20, 3, 4)
  }
  for (let i = 0; i < 5; i++) px(ctx, PAPER, x + 18 + i * 24, y + 36, 4, 28)
  px(ctx, '#241810', x + 62, y + 36, 16, 28)
  px(ctx, GOLD, x + 68, y + 46, 4, 6)

  tree(ctx, 28, 96, 16)
  tree(ctx, 228, 98, 18)
  person(ctx, 92, 112, '#243044', time, 0.4)
  person(ctx, 156, 114, '#6a3030', time, 1.6)
  px(ctx, WOOD, 40, 118, 16, 3)
  px(ctx, WOOD, 42, 116, 2, 8)
  px(ctx, WOOD, 52, 116, 2, 8)
  edge(ctx)
}

function monitor(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, bezel = INK): void {
  px(ctx, bezel, x, y, w, h)
  px(ctx, '#071820', x + 2, y + 2, w - 4, h - 6)
}

function drawLab(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#120c1c', 0, 0, W, H)
  px(ctx, '#1a1430', 0, 108, W, 36)
  px(ctx, '#2a2048', 0, 108, W, 3)
  for (let i = 0; i < 3; i++) {
    px(ctx, '#d8f6ff', 28 + i * 78, 8, 28, 4)
    dither(ctx, CYAN, 20 + i * 78, 12, 44, 18, 3)
  }

  monitor(ctx, 16, 40, 52, 48)
  px(ctx, RED, 24, 50, 6, 24)
  px(ctx, '#ff8a8a', 34, 58, 6, 16)
  px(ctx, GOLD, 44, 66, 6, 8)
  px(ctx, CYAN, 54, 48, 6, 26)

  monitor(ctx, 88, 18, 80, 58)
  const eaten = Math.floor(time * 2) % 8
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const colors = [GOLD, CYAN, MAGENTA, '#e8d0ff', PAPER, '#ff8a3d', '#7dffb2', RED]
      const swallowed = col > 7 - eaten
      const color = swallowed ? GOLD : colors[hash(col, row) % colors.length]!
      px(ctx, color, 94 + col * 9, 24 + row * 9, 7, 7)
      if (swallowed) px(ctx, GOLD_HOT, 94 + col * 9, 24 + row * 9, 7, 2)
    }
  }

  px(ctx, '#0c0c12', 176, 40, 58, 78)
  px(ctx, '#242430', 180, 46, 50, 64)
  for (let i = 0; i < 4; i++) {
    const fy = 52 + i * 14
    disc(ctx, INK, 196, fy + 4, 5)
    disc(ctx, i % 2 ? CYAN : MAGENTA, 196, fy + 4, 2)
    px(ctx, i % 2 ? GOLD : CYAN, 214, fy, 12, 3)
    if (Math.floor(time * 8 + i) % 2 === 0) px(ctx, GOLD_HOT, 214, fy, 4, 3)
  }
  px(ctx, GOLD, 184, 112, 18, 4)
  px(ctx, '#3a3a48', 168, 118, 8, 10)

  px(ctx, WOOD, 16, 100, 150, 8)
  px(ctx, '#3a2418', 24, 108, 4, 20)
  px(ctx, '#3a2418', 150, 108, 4, 20)
  person(ctx, 78, 48, '#1a2848', time, 0)
  edge(ctx)
}

function drawPaper(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#100c18', 0, 0, W, H)
  px(ctx, '#1a2848', 168, 16, 72, 64)
  px(ctx, '#0c1018', 172, 20, 64, 56)
  for (let i = 0; i < 5; i++) {
    px(ctx, '#12101c', 178 + i * 12, 28, 8, 40)
    if (hash(i, 4) % 2) px(ctx, GOLD, 180 + i * 12, 40, 3, 4)
  }
  for (let y = 22; y < 74; y += 3) {
    if ((y + Math.floor(time * 10)) % 9 === 0) px(ctx, CYAN, 174, y, 60, 1)
  }

  for (let i = 0; i < 8; i++) {
    px(ctx, '#ffd8a0', 28, 18 + i * 4, 8 + i * 10, 3)
  }
  px(ctx, GOLD, 24, 14, 8, 6)
  px(ctx, PAPER, 72, 16, 92, 62)
  px(ctx, '#e4dcc8', 72, 16, 92, 3)
  px(ctx, INK, 88, 24, 64, 3)
  px(ctx, INK, 88, 30, 40, 2)
  for (let i = 0; i < 3; i++) px(ctx, '#5a564c', 88, 38 + i * 5, 72 - (i % 2) * 12, 2)
  px(ctx, CYAN, 88, 54, 6, 16)
  px(ctx, GOLD, 98, 46, 6, 24)
  px(ctx, GOLD_HOT, 108, 38, 6, 32)
  px(ctx, MAGENTA, 118, 30, 6, 40)
  disc(ctx, GOLD, 150, 58, 7)
  disc(ctx, RED, 150, 58, 4)
  px(ctx, PAPER, 148, 56, 4, 4)

  px(ctx, '#3a2418', 20, 124, 16, 10)
  px(ctx, PAPER, 24, 120, 8, 6)
  px(ctx, WOOD, 0, 118, W, 26)
  px(ctx, '#4a2c18', 0, 118, W, 3)
  edge(ctx)
}

function drawKitchen(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#241830', 0, 0, W, H)
  px(ctx, '#3a2848', 0, 0, W, 8)
  px(ctx, WOOD, 8, 14, 150, 26)
  px(ctx, '#4a2818', 14, 18, 36, 16)
  px(ctx, '#4a2818', 56, 18, 36, 16)
  px(ctx, '#4a2818', 98, 18, 36, 16)
  px(ctx, '#8a5a38', 16, 20, 32, 2)
  px(ctx, '#8a5a38', 58, 20, 32, 2)
  px(ctx, '#8a5a38', 100, 20, 32, 2)

  px(ctx, '#101820', 176, 16, 64, 52)
  px(ctx, WOOD, 170, 10, 76, 6)
  px(ctx, WOOD, 170, 68, 76, 6)
  px(ctx, WOOD, 170, 10, 6, 64)
  px(ctx, WOOD, 240, 10, 6, 64)
  for (let i = 0; i < 4; i++) {
    px(ctx, '#16141e', 182 + i * 14, 28, 10, 26 + (i % 2) * 8)
    if (hash(i, 8) % 2) px(ctx, GOLD, 184 + i * 14, 36, 3, 3)
  }

  px(ctx, '#e4e0d8', 10, 52, 34, 62)
  px(ctx, '#c8c4bc', 10, 52, 34, 4)
  px(ctx, '#b8b4ac', 14, 78, 26, 2)
  px(ctx, GOLD, 22, 62, 4, 6)

  px(ctx, '#c4a070', 0, 108, W, 10)
  px(ctx, '#8a6848', 0, 108, W, 2)
  px(ctx, WOOD, 0, 118, W, 26)
  px(ctx, '#3a2418', 24, 122, 5, 22)
  px(ctx, '#3a2418', 210, 122, 5, 22)

  px(ctx, INK, 86, 64, 78, 52)
  const glow = Math.sin(time * 4) > 0 ? '#143848' : '#0e2838'
  px(ctx, glow, 90, 68, 70, 40)
  px(ctx, PAPER, 98, 74, 26, 10)
  px(ctx, CYAN, 128, 88, 26, 10)
  px(ctx, GOLD, 100, 102, 18, 3)
  if (Math.floor(time * 2) % 2 === 0) px(ctx, PAPER, 150, 100, 5, 2)
  px(ctx, '#5a4030', 168, 92, 12, 16)
  px(ctx, PAPER, 170, 88, 8, 6)
  disc(ctx, '#2f8a4a', 204, 96, 6)
  px(ctx, '#1f5a30', 202, 100, 4, 8)

  person(ctx, 68, 90, '#1a2848', time, 0.3)
  px(ctx, CYAN, 73, 93, 2, 2)
  edge(ctx)
}

function rack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  time: number,
  seed: number,
  dim = 0,
): void {
  px(ctx, '#10182c', x, y, w, h)
  px(ctx, dim > 0.45 ? '#182030' : '#243458', x, y, w, 2)
  px(ctx, '#050810', x, y + 2, 2, h - 2)
  const rows = Math.max(3, Math.floor((h - 6) / 5))
  for (let i = 0; i < rows; i++) {
    const yy = y + 4 + i * 5
    const blink = hash(seed, i) % 7 === Math.floor(time * 4) % 7
    const color = dim > 0.55 || blink ? '#182030' : i % 2 === 0 ? CYAN : GOLD
    px(ctx, color, x + 3, yy, Math.max(2, w - 6), 2)
  }
}

function die(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  for (let i = 4; i < w - 4; i += 6) {
    px(ctx, GOLD, x + i, y - 3, 2, 3)
    px(ctx, GOLD, x + i, y + h, 2, 3)
  }
  px(ctx, GOLD, x, y, w, h)
  px(ctx, '#3a2808', x, y + ((h / 2) | 0) - 2, 3, 4)
  px(ctx, GOLD_HOT, x + 6, y + 3, w - 12, h - 6)
  px(ctx, PAPER, x + 8, y + 5, Math.max(6, (w / 3) | 0), 2)
}

function drawHalls(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#07040f', 0, 0, W, H)
  px(ctx, '#140818', 0, 0, W, 10)
  rack(ctx, 8, 16, 28, 56, time, 1, 0.7)
  rack(ctx, 40, 22, 22, 46, time, 2, 0.45)
  rack(ctx, 194, 22, 22, 46, time, 3, 0.45)
  rack(ctx, 220, 16, 28, 56, time, 4, 0.7)
  for (const [x, y] of [
    [68, 36],
    [78, 42],
    [88, 48],
    [168, 40],
    [176, 46],
  ] as Array<[number, number]>) {
    px(ctx, GOLD, x, y, 1, 1)
  }
  die(ctx, 96, 34, 40, 16)
  official(ctx, 146, 28, PAPER, time, 0.4)
  edge(ctx)
}

function official(ctx: CanvasRenderingContext2D, x: number, y: number, coat: string, time: number, phase: number): void {
  const step = Math.sin(time * 3 + phase) > 0 ? 1 : 0
  px(ctx, '#f0d2b0', x + 4, y, 6, 5)
  px(ctx, INK, x + 4, y, 6, 2)
  px(ctx, coat, x + 1, y + 5, 12, 14)
  px(ctx, PAPER, x + 5, y + 8, 4, 6)
  px(ctx, coat, x + 3, y + 19, 3, 6 + step)
  px(ctx, coat, x + 8, y + 19, 3, 7 - step)
}

function drawOrder(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#07040f', 0, 0, W, H)
  px(ctx, PAPER, 104, 8, 48, 22)
  px(ctx, '#5a564c', 110, 12, 26, 2)
  px(ctx, '#5a564c', 110, 16, 18, 1)
  px(ctx, GOLD, 110, 20, 14, 2)
  disc(ctx, GOLD, 140, 18, 5)
  disc(ctx, RED, 140, 18, 2)
  official(ctx, 96, 36, MAGENTA, time, 0)
  official(ctx, 114, 34, CYAN, time, 1)
  official(ctx, 132, 36, GOLD, time, 1.6)
  official(ctx, 150, 32, RED, time, 2.2)
  edge(ctx)
}

function drawShip(ctx: CanvasRenderingContext2D, time: number): void {
  bands(ctx, ['#100818', '#1c1240', '#301848'], 0, 78)
  stars(ctx, 24, 40, PAPER, time)
  for (let i = 0; i < 6; i++) {
    const x = 8 + i * 18
    const broken = i < 3
    px(ctx, broken ? '#3a2030' : GOLD, x, 40, 6, 70)
    px(ctx, broken ? RED : GOLD_HOT, x, 40, 6, 3)
    if (broken) px(ctx, INK, x + 1, 58, 4, 10)
  }
  px(ctx, '#1a1028', 0, 108, W, 36)

  const x = 108 + Math.sin(time * 1.4) * 6
  dither(ctx, CYAN, x - 8, 48, 92, 56, 2)
  px(ctx, '#e8f6ff', x, 52, 70, 46)
  px(ctx, CYAN, x + 4, 56, 62, 28)
  px(ctx, INK, x + 10, 62, 28, 4)
  px(ctx, INK, x + 10, 70, 40, 3)
  px(ctx, GOLD, x + 44, 62, 16, 16)
  px(ctx, INK, x + 48, 66, 8, 8)
  px(ctx, MAGENTA, x, 92, 70, 6)
  for (let i = 0; i < 4; i++) px(ctx, GOLD_HOT, x - 16 - i * 8, 70, 6, 2)
  px(ctx, '#9aa0b8', 200, 96, 36, 16)
  px(ctx, CYAN, 206, 100, 10, 6)
  edge(ctx)
}

function drawVeto(ctx: CanvasRenderingContext2D, time: number): void {
  bands(ctx, ['#243048', '#4a6078', '#d8c8a8'], 0, 70)
  px(ctx, PAPER, 150, 18, 70, 36)
  disc(ctx, '#e8e0d4', 185, 18, 22)
  px(ctx, '#e8e0d4', 168, 28, 34, 20)
  px(ctx, '#b8b0a4', 178, 36, 4, 16)
  px(ctx, '#b8b0a4', 188, 36, 4, 16)
  px(ctx, GOLD, 182, 14, 6, 6)

  px(ctx, '#6a4228', 0, 78, W, 66)
  px(ctx, '#8a5a38', 0, 78, W, 6)
  px(ctx, PAPER, 48, 40, 100, 78)
  px(ctx, '#efe8dc', 48, 40, 100, 5)
  for (let i = 0; i < 7; i++) px(ctx, '#6a655c', 58, 52 + i * 7, 78 - (i % 3) * 12, 2)
  const stamp = 16 + (Math.sin(time * 3) > 0 ? 1 : 0)
  disc(ctx, RED, 108, 86, stamp)
  disc(ctx, PAPER, 108, 86, stamp - 5)
  for (let i = -11; i <= 11; i++) px(ctx, RED, 107 + i, 85 + i, 3, 3)
  px(ctx, '#1a1a1a', 170, 96, 40, 4)
  px(ctx, GOLD, 206, 92, 6, 10)
  px(ctx, '#f4f0e6', 36, 96, 10, 16)
  dither(ctx, GOLD, 20, 70, 30, 20, 3)
  edge(ctx)
}

function drawWeights(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, INK, 0, 0, W, H)
  px(ctx, '#101820', 16, 14, 150, 116)
  px(ctx, '#061014', 20, 18, 142, 104)
  px(ctx, CYAN, 20, 18, 142, 2)
  for (let i = 0; i < 9; i++) {
    const w = 40 + hash(i, 2) % 80
    px(ctx, i % 3 === 0 ? GOLD : CYAN, 28, 28 + i * 10, w, 3)
  }
  if (Math.floor(time * 2) % 2 === 0) px(ctx, PAPER, 28, 112, 8, 3)

  for (let i = 0; i < 4; i++) {
    px(ctx, i < 2 ? '#4a2030' : RED, 176, 20 + i * 16, 8, 48)
    if (i < 2) px(ctx, INK, 177, 36, 6, 8)
  }
  const lift = Math.sin(time * 2) * 3
  for (let i = 0; i < 4; i++) {
    const y = 36 + i * 12 + lift
    px(ctx, GOLD, 196, y, 36 - i * 4, 8)
    px(ctx, GOLD_HOT, 198, y + 2, 28 - i * 4, 3)
  }
  px(ctx, PAPER, 206, 78, 16, 18)
  px(ctx, INK, 210, 82, 8, 3)
  px(ctx, INK, 210, 88, 8, 8)
  dither(ctx, CYAN, 180, 100, 60, 28, 2)
  edge(ctx)
}

function node(ctx: CanvasRenderingContext2D, x: number, y: number, hot: boolean): void {
  disc(ctx, hot ? RED : '#3a4460', x, y, hot ? 4 : 3)
  if (hot) disc(ctx, GOLD_HOT, x, y, 1)
}

function link(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color: string): void {
  const steps = 12
  for (let i = 0; i <= steps; i++) {
    const u = i / steps
    px(ctx, color, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 2, 2)
  }
}

function drawWire(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, '#06040c', 0, 0, W, H)
  dither(ctx, '#140818', 0, 0, W, H, 4)
  const pts: Array<[number, number]> = [
    [28, 40],
    [70, 28],
    [108, 48],
    [86, 78],
    [140, 36],
    [168, 70],
    [200, 32],
    [228, 58],
    [150, 100],
    [48, 108],
    [112, 112],
  ]
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]!
    const b = pts[(i + 3) % pts.length]!
    link(ctx, a[0], a[1], b[0], b[1], '#2a3148')
  }
  const pulse = Math.floor(time * 3) % pts.length
  for (let i = 0; i < 5; i++) {
    const a = pts[(pulse + i) % pts.length]!
    const b = pts[(pulse + i + 1) % pts.length]!
    link(ctx, a[0], a[1], b[0], b[1], i === 4 ? GOLD : RED)
  }
  pts.forEach((p, i) => node(ctx, p[0], p[1], (pulse + i) % 5 === 0))

  px(ctx, '#14080c', 12, 96, 92, 36)
  px(ctx, RED, 16, 100, 84, 2)
  px(ctx, PAPER, 16, 108, 60, 3)
  px(ctx, '#ffb0b8', 16, 116, 40, 2)
  px(ctx, GOLD, 16, 122, 24, 2)
  edge(ctx)
}

function drawBlackout(ctx: CanvasRenderingContext2D, time: number): void {
  skyline(ctx, time, false)
  die(ctx, 114, 40, 28, 14)
  px(ctx, GOLD, 108, 52, 2, 2)
  px(ctx, GOLD, 148, 48, 2, 2)
  edge(ctx)
}

function drawManual(ctx: CanvasRenderingContext2D, time: number): void {
  px(ctx, INK, 0, 0, W, H)
  px(ctx, '#12081c', 88, 8, 80, 70)
  px(ctx, '#3a2460', 88, 8, 80, 2)
  px(ctx, '#3a2460', 88, 76, 80, 2)
  px(ctx, '#3a2460', 88, 8, 2, 70)
  px(ctx, '#3a2460', 166, 8, 2, 70)
  for (let i = 0; i < 5; i++) {
    const eaten = i < Math.floor(time * 2) % 5
    const x = 100 + i * 12
    px(ctx, eaten ? '#3a2808' : GOLD, x, 18, 6, 4)
    if (!eaten) px(ctx, GOLD_HOT, x, 18, 6, 1)
  }
  die(ctx, 112, 30, 32, 14)
  official(ctx, 96, 50, MAGENTA, time, 0)
  official(ctx, 114, 50, CYAN, time, 1)
  official(ctx, 132, 50, GOLD, time, 2)
  official(ctx, 150, 50, RED, time, 3)
  const bob = Math.sin(time * 3) > 0 ? 0 : 2
  px(ctx, PAPER, 122, 16 + bob, 8, 4)
  edge(ctx)
}

export function drawComic(ctx: CanvasRenderingContext2D, scene: SceneId, time = 0): void {
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = INK
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.imageSmoothingEnabled = false
  ctx.setTransform(4, 0, 0, 4, 0, 0)
  if (scene === 'city') drawCity(ctx, time)
  else if (scene === 'evening') drawEvening(ctx, time)
  else if (scene === 'dartmouth') drawDartmouth(ctx, time)
  else if (scene === 'lab') drawLab(ctx, time)
  else if (scene === 'paper') drawPaper(ctx, time)
  else if (scene === 'kitchen') drawKitchen(ctx, time)
  else if (scene === 'halls') drawHalls(ctx, time)
  else if (scene === 'order') drawOrder(ctx, time)
  else if (scene === 'ship') drawShip(ctx, time)
  else if (scene === 'veto') drawVeto(ctx, time)
  else if (scene === 'weights') drawWeights(ctx, time)
  else if (scene === 'wire') drawWire(ctx, time)
  else if (scene === 'manual') drawManual(ctx, time)
  else drawBlackout(ctx, time)
  ctx.restore()
}
