// The title screen, drawn like an old cartridge cover: 3D key art, the premise
// in one line, and the company's datacenter on the horizon pulling RAM out of
// people's homes, with the company's last build rising behind it like a sun.
// Under it the cast, one big start button and the board of top valuations.

import { LAWS } from './levels'
import { ALERT, GLOW, ICE } from './palette'
import { DISPLAY, MONO, fill, label } from './render'
import { frameFor } from './scenes'
import { hit, type Frame, type Hit, type HitId, type View } from './screen'
import { drawFacing, drawUpright, lawSprite, miniFrame, pacFrameOf } from './sprites'

function art(name: string): HTMLImageElement {
  const im = new Image()
  im.src = `${import.meta.env.BASE_URL}art/${name}.png`
  return im
}

const KEYART = art('title')
const KEY_W = 261
const KEY_H = 88

// fixed, so the sky does not reshuffle every frame
const STARS = Array.from({ length: 140 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453
    return x - Math.floor(x)
  }
  return { x: r(1), y: r(2), s: r(3) < 0.12 ? 2 : 1, pink: r(4) < 0.04, phase: r(5) * 6.28 }
})


// A chunky arcade button with a visible edge underneath. It sinks when the
// pointer is on it or it is being pressed.
function bigButton(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  id: HitId,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  look: { face: string; light: string; edge: string; ink: string; size: number; glow: number },
): void {
  const lit = frame.view.hover === id || frame.view.held.has(id)
  const depth = 8
  const sink = frame.view.held.has(id) ? depth - 2 : lit ? 3 : 0
  ctx.save()
  if (look.glow > 0) {
    ctx.shadowColor = look.face
    ctx.shadowBlur = look.glow
  }
  fill(ctx, '#000000', x - 3, y - 3 + sink, w + 6, h + depth - sink + 6)
  ctx.restore()
  fill(ctx, look.edge, x, y + h - 4 + sink, w, depth - sink + 4)
  fill(ctx, look.face, x, y + sink, w, h)
  fill(ctx, look.light, x, y + sink, w, 4)
  fill(ctx, look.light, x, y + sink, 4, h)
  fill(ctx, 'rgba(0, 0, 0, 0.25)', x + w - 4, y + sink, 4, h)
  ctx.font = `900 ${look.size}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = look.ink
  ctx.letterSpacing = `${look.size * 0.12}px`
  ctx.fillText(text, x + w / 2, y + h / 2 + sink + 2)
  ctx.letterSpacing = '0px'
  hit(frame, id, x - 3, y - 3, w + 6, h + depth + 6)
}

// Background server racks along the horizon, dim, with blinking status lights.
function racks(ctx: CanvasRenderingContext2D, from: number, to: number, horizon: number, t: number, side: number): void {
  let x = from
  let i = 0
  while (side > 0 ? x < to : x > to) {
    const r = Math.sin(i * 12.9898 + 3) * 43758.5453
    const n = r - Math.floor(r)
    const w = 40 + Math.floor(n * 4) * 8
    const h = 70 + Math.floor(((n * 7) % 1) * 5) * 22
    const left = side > 0 ? x : x - w
    fill(ctx, '#04020a', left, horizon - h, w, h)
    fill(ctx, 'rgba(150, 214, 255, 0.22)', left, horizon - h, w, 2)
    for (let y = horizon - h + 10; y < horizon - 8; y += 12) {
      fill(ctx, 'rgba(150, 214, 255, 0.05)', left + 6, y, w - 12, 6)
      if (Math.sin(t * (1.5 + n * 3) + y * 0.37 + i) > 0.7) fill(ctx, (y + i) % 3 === 0 ? 'rgba(255, 45, 111, 0.6)' : 'rgba(150, 214, 255, 0.6)', left + w - 12, y + 1, 3, 3)
    }
    x += side * (w + 4)
    i++
  }
}

// The RAM stick from the board (22x12 pixel art), centred on x, y at scale s.
function stick(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  const ox = Math.round(x - 11 * s)
  const oy = Math.round(y - 6 * s)
  const px = (color: string, a: number, b: number, w: number, h: number) => {
    ctx.fillStyle = color
    ctx.fillRect(ox + a * s, oy + b * s, w * s, h * s)
  }
  px('#ffb38a', 0, 0, 22, 10)
  px('#ffe0c8', 0, 0, 22, 1)
  px('#000000', 10, 8, 2, 2)
  for (const a of [2, 8, 14]) px('#4a1d12', a, 2, 5, 5)
  for (let a = 1; a < 21; a += 2) if (a < 10 || a > 11) px('#ffd36b', a, 10, 1, 2)
}

// A hyperboloid cooling tower with steam rolling off the top.
function coolingTower(ctx: CanvasRenderingContext2D, cx: number, base: number, w: number, h: number, t: number): void {
  for (let k = 0; k < 5; k++) {
    const u = ((t * 0.18 + k / 5) % 1)
    const r = w * (0.22 + u * 0.4)
    ctx.globalAlpha = 0.18 * (1 - u)
    ctx.fillStyle = '#cfe6f5'
    ctx.beginPath()
    ctx.arc(cx + Math.sin(k * 2.1 + t * 0.4) * w * 0.15 + u * w * 0.3, base - h - u * h * 0.9, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  const top = w * 0.32
  const waist = w * 0.27
  const foot = w * 0.5
  ctx.beginPath()
  ctx.moveTo(cx - foot, base)
  ctx.quadraticCurveTo(cx - waist * 0.7, base - h * 0.55, cx - top, base - h)
  ctx.lineTo(cx + top, base - h)
  ctx.quadraticCurveTo(cx + waist * 0.7, base - h * 0.55, cx + foot, base)
  ctx.closePath()
  const g = ctx.createLinearGradient(cx - foot, 0, cx + foot, 0)
  g.addColorStop(0, '#0b1626')
  g.addColorStop(0.35, '#16263a')
  g.addColorStop(1, '#04070d')
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = 'rgba(150, 214, 255, 0.45)'
  ctx.lineWidth = 2
  ctx.stroke()
  fill(ctx, 'rgba(226, 245, 255, 0.7)', cx - top, base - h, top * 2, 3)
  // a warning light on the rim
  if (Math.sin(t * 3 + cx) > 0) fill(ctx, ALERT, cx - 3, base - h - 6, 6, 5)
}

// A lattice power pylon, returning the points its lines hang from.
function pylon(ctx: CanvasRenderingContext2D, x: number, base: number, h: number): void {
  ctx.strokeStyle = 'rgba(150, 214, 255, 0.5)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x - h * 0.16, base)
  ctx.lineTo(x - 2, base - h)
  ctx.lineTo(x + 2, base - h)
  ctx.lineTo(x + h * 0.16, base)
  for (let k = 1; k < 5; k++) {
    const y = base - (h * k) / 5
    const half = 2 + h * 0.16 * (1 - k / 5)
    ctx.moveTo(x - half, y)
    ctx.lineTo(x + half, y)
  }
  ctx.moveTo(x - h * 0.22, base - h * 0.82)
  ctx.lineTo(x + h * 0.22, base - h * 0.82)
  ctx.stroke()
}

// A small house with lit windows. The lights go out once in a while.
function house(ctx: CanvasRenderingContext2D, x: number, base: number, s: number, t: number, seed: number): void {
  const w = 34 * s
  const h = 22 * s
  ctx.fillStyle = '#070b14'
  ctx.beginPath()
  ctx.moveTo(x - w / 2 - 4 * s, base - h)
  ctx.lineTo(x, base - h - 16 * s)
  ctx.lineTo(x + w / 2 + 4 * s, base - h)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 201, 74, 0.55)'
  ctx.lineWidth = 2
  ctx.stroke()
  fill(ctx, '#070b14', x - w / 2, base - h, w, h)
  fill(ctx, 'rgba(255, 201, 74, 0.35)', x - w / 2, base - h, 2, h)
  fill(ctx, 'rgba(255, 201, 74, 0.35)', x + w / 2 - 2, base - h, 2, h)
  const dark = Math.sin(t * 0.7 + seed * 1.9) > 0.55
  const win = dark ? 'rgba(255, 201, 74, 0.12)' : '#ffc94a'
  fill(ctx, win, x - w / 2 + 5 * s, base - h + 5 * s, 8 * s, 7 * s)
  fill(ctx, win, x + w / 2 - 13 * s, base - h + 5 * s, 8 * s, 7 * s)
  fill(ctx, 'rgba(255, 201, 74, 0.25)', x - 3 * s, base - 10 * s, 6 * s, 10 * s)
}

// Points along a sagging cable from a to b.
function sag(ax: number, ay: number, bx: number, by: number, u: number, droop: number): [number, number] {
  return [ax + (bx - ax) * u, ay + (by - ay) * u + Math.sin(u * Math.PI) * droop]
}

// The star of the screen: INFINITE LABS' datacenter on the horizon, with
// cooling towers, power lines running out to the houses at the edges of the
// world, and RAM sticks riding the lines in.
function datacenter(ctx: CanvasRenderingContext2D, W: number, ex: number, horizon: number, hallW: number, hallH: number, t: number, portrait: boolean): void {
  const cx = W / 2
  const left = cx - hallW / 2
  const right = cx + hallW / 2
  const top = horizon - hallH

  // power lines first, so the buildings stand in front of them
  const ph = portrait ? 96 : 84
  const lineY = horizon - ph * 0.82
  const inY = top + hallH * 0.35
  const sticks: Array<[number, number]> = []
  for (const side of [-1, 1]) {
    const edge = side < 0 ? -ex : W + ex
    const start = side < 0 ? left : right
    const towers: number[] = []
    const step = portrait ? 120 : 150
    for (let x = start + side * (portrait ? 130 : 150); side < 0 ? x > edge + 30 : x < edge - 30; x += side * step) towers.push(x)
    const pts: Array<[number, number]> = [[start, inY], ...towers.map((x): [number, number] => [x, lineY])]
    // houses beyond each pylon, out to the edge
    for (let x = (towers[0] ?? start) + side * step * 0.5, k = 0; side < 0 ? x > edge : x < edge; x += side * step, k++) {
      house(ctx, x, horizon, portrait ? 1.15 : 1, t, k * 3 + side)
    }
    const homes: number[] = []
    for (let x = (towers[0] ?? start) + side * step * 0.5; side < 0 ? x > edge : x < edge; x += side * step) homes.push(x)
    ctx.strokeStyle = 'rgba(150, 214, 255, 0.45)'
    ctx.lineWidth = 1.5
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, ay] = pts[k]!
      const [bx, by] = pts[k + 1]!
      ctx.beginPath()
      for (let j = 0; j <= 16; j++) {
        const [x, y] = sag(ax, ay, bx, by, j / 16, 12)
        if (j === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    for (const x of towers) pylon(ctx, x, horizon, ph)
    // a drop line from each pylon to the house beside it
    for (let k = 0; k < Math.min(homes.length, towers.length); k++) {
      ctx.beginPath()
      ctx.moveTo(towers[k]!, lineY)
      ctx.lineTo(homes[k]!, horizon - (portrait ? 46 : 40))
      ctx.stroke()
    }
    // RAM sticks riding the line from the houses into the hall
    const segs = pts.length - 1
    if (segs > 0) {
      for (let n = 0; n < segs * 2; n++) {
        const along = ((t * 0.09 + n / (segs * 2)) % 1)
        const pos = (1 - along) * segs
        const k = Math.min(segs - 1, Math.floor(pos))
        const [ax, ay] = pts[k]!
        const [bx, by] = pts[k + 1]!
        sticks.push(sag(ax, ay, bx, by, pos - k, 12))
      }
    }
  }

  // cooling towers either side of the hall
  const ct = portrait ? 120 : 140
  coolingTower(ctx, left - (portrait ? 48 : 60), horizon, ct * 0.7, ct, t)
  coolingTower(ctx, right + (portrait ? 48 : 60), horizon, ct * 0.7, ct, t + 1.3)

  // the hall: a tall core block and two long wings
  const coreW = hallW * 0.36
  const coreTop = top - hallH * 0.35
  const block = (x: number, y: number, w: number, h: number) => {
    fill(ctx, '#05030c', x, y, w, h)
    fill(ctx, 'rgba(226, 245, 255, 0.8)', x, y, w, 2)
    fill(ctx, 'rgba(150, 214, 255, 0.35)', x, y, 2, h)
    fill(ctx, 'rgba(150, 214, 255, 0.35)', x + w - 2, y, 2, h)
  }
  block(left, top, hallW, hallH)
  block(cx - coreW / 2, coreTop, coreW, horizon - coreTop)
  // rooftop chillers on the wings
  for (let x = left + 14; x < cx - coreW / 2 - 30; x += 40) fill(ctx, '#1a2a3d', x, top - 10, 28, 10)
  for (let x = right - 42; x > cx + coreW / 2 + 2; x -= 40) fill(ctx, '#1a2a3d', x, top - 10, 28, 10)
  // rack bays through the glass, each with blinking status lights
  const bay = (x0: number, x1: number, y0: number, y1: number, seed: number) => {
    let i = 0
    for (let x = x0; x + 22 <= x1; x += 26) {
      fill(ctx, 'rgba(150, 214, 255, 0.07)', x, y0, 22, y1 - y0)
      for (let y = y0 + 4; y + 4 < y1; y += 9) {
        fill(ctx, 'rgba(150, 214, 255, 0.12)', x + 2, y, 18, 5)
        const on = Math.sin(t * (2 + ((i * 7) % 5)) + y * 0.41 + x * 0.13 + seed) > 0.35
        if (on) fill(ctx, (i + y) % 5 === 0 ? ALERT : (i + y) % 3 === 0 ? '#ffffff' : GLOW, x + 15, y + 1, 3, 3)
      }
      i++
    }
  }
  bay(left + 12, cx - coreW / 2 - 8, top + 14, horizon - 10, 0)
  bay(cx + coreW / 2 + 8, right - 12, top + 14, horizon - 10, 2)
  bay(cx - coreW / 2 + 12, cx + coreW / 2 - 12, coreTop + 64, horizon - 10, 4)
  // the neon sign on the core
  const sz = portrait ? 26 : 24
  ctx.save()
  ctx.font = `900 ${sz}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.letterSpacing = `${sz * 0.12}px`
  const flick = Math.sin(t * 13) > -0.95 ? 1 : 0.4
  ctx.shadowColor = ALERT
  ctx.shadowBlur = 16
  ctx.globalAlpha = flick
  ctx.fillStyle = '#ff6fa0'
  ctx.fillText('INFINITE LABS', cx, coreTop + 22, coreW - 12)
  ctx.font = `${portrait ? 22 : 20}px ${MONO}`
  ctx.letterSpacing = '2px'
  ctx.shadowBlur = 8
  ctx.fillStyle = 'rgba(226, 245, 255, 0.85)'
  ctx.fillText('DATACENTER 01', cx, coreTop + 46, coreW - 12)
  ctx.restore()

  // the sticks on the lines go in over everything
  ctx.imageSmoothingEnabled = false
  for (const [x, y] of sticks) stick(ctx, x, y - 4, portrait ? 1.3 : 1.1)
}

// Fit a line of text to a width by shrinking the font.
function fitSize(ctx: CanvasRenderingContext2D, text: string, font: (n: number) => string, size: number, maxW: number, spacing = 0): number {
  let n = size
  for (; n > 10; n -= 1) {
    ctx.font = font(n)
    ctx.letterSpacing = `${n * spacing}px`
    if (ctx.measureText(text).width <= maxW) break
  }
  ctx.letterSpacing = '0px'
  return n
}

// A line of the big tagline, in the logo's chrome with a hot glow.
function shout(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, maxW: number, ink: string, glow: string): void {
  const n = fitSize(ctx, text, (k) => `900 ${k}px ${DISPLAY}`, size, maxW, 0.06)
  ctx.save()
  ctx.font = `900 ${n}px ${DISPLAY}`
  ctx.letterSpacing = `${n * 0.06}px`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000000'
  ctx.fillText(text, x + 3, y + 4)
  ctx.shadowColor = glow
  ctx.shadowBlur = 18
  ctx.fillStyle = ink
  ctx.fillText(text, x, y)
  ctx.restore()
}

// Who is who, like the attract screen of an old arcade cabinet.
function cast(ctx: CanvasRenderingContext2D, W: number, y: number, portrait: boolean, t: number, form: number): void {
  const size = portrait ? 60 : 50
  const lsz = portrait ? 32 : 28
  const gap = portrait ? 122 : 128
  const ghosts = [0, 1, 2]
  const n = 3 + ghosts.length
  const x0 = W / 2 - ((n - 1) * gap) / 2 - (portrait ? 0 : 24)
  const bob = (k: number) => Math.round(Math.sin(t * 3 + k) * 2)
  const at = (k: number) => x0 + k * gap + (k >= 3 && !portrait ? 48 : 0)
  ctx.imageSmoothingEnabled = false
  const you = pacFrameOf(form, t * 8)
  if (you) drawFacing(ctx, you, at(0), y + bob(0), size * 1.15, 'right', 'right')
  stick(ctx, at(1), y + bob(1), portrait ? 2.2 : 1.9)
  const mini = miniFrame(t * 6)
  if (mini) drawUpright(ctx, mini, at(2), y + bob(2), size)
  for (const g of ghosts) {
    const sp = lawSprite(g, 'body')
    if (sp) drawUpright(ctx, sp, at(3 + g), y + bob(3 + g), size, 'left')
  }
  const ly = y + size / 2 + lsz * 0.75
  label(ctx, 'YOU', at(0), ly, lsz, ICE)
  label(ctx, 'RAM', at(1), ly, lsz, '#ffb38a')
  label(ctx, 'PEOPLE', at(2), ly, lsz, '#ffc94a')
  for (const g of ghosts) label(ctx, LAWS[g]!.tag, at(3 + g), ly, lsz, LAWS[g]!.color)
  // a divider between your side and the resistance, with its name over it
  const mid = (at(2) + at(3)) / 2
  fill(ctx, 'rgba(150, 214, 255, 0.25)', mid - 1, y - size / 2, 2, size + lsz * 1.4)
  label(ctx, 'THE RESISTANCE', (at(3) + at(5)) / 2, y - size / 2 - lsz * 0.55, lsz * 0.82, 'rgba(255, 190, 215, 0.9)')
}

export function drawTitle(ctx: CanvasRenderingContext2D, view: View, form: number): Hit[] {
  ctx.save()
  fill(ctx, '#000000', 0, 0, view.width, view.height)
  const portrait = view.width < view.height * 1.05
  const W = portrait ? 800 : 1240
  const H = portrait ? 1300 : 860
  const frame = frameFor(ctx, view, W, H)
  const t = view.time

  // sky, extended past the design area so wide screens have stars too
  const ex = frame.ox / frame.s
  const ey = frame.oy / frame.s
  for (const s of STARS) {
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + s.phase))
    ctx.globalAlpha = tw
    fill(ctx, s.pink ? ALERT : ICE, -ex + s.x * (W + ex * 2), -ey + s.y * (H + ey * 2), s.s * 2, s.s * 2)
  }
  ctx.globalAlpha = 1

  const horizon = portrait ? 790 : 584
  const floorBottom = H + ey

  // the company's last build rising behind the datacenter like a sun, cut by
  // the bands of a sunset
  const er = portrait ? 190 : 132
  const ecx = W / 2
  const ecy = horizon - er * 0.95
  const halo = ctx.createRadialGradient(ecx, ecy, er * 0.4, ecx, ecy, er * 1.9)
  halo.addColorStop(0, 'rgba(255, 45, 111, 0.24)')
  halo.addColorStop(1, 'rgba(255, 45, 111, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(ecx - er * 2, ecy - er * 2, er * 4, horizon - (ecy - er * 2))
  const sun = pacFrameOf(3, t * 1.2)
  if (sun) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(ecx - er, ecy - er, er * 2, horizon - (ecy - er))
    ctx.clip()
    ctx.globalAlpha = 0.45
    drawFacing(ctx, sun, ecx, ecy, er * 2, 'right', 'right')
    ctx.globalAlpha = 1
    for (let k = 0; k < 7; k++) {
      const y = ecy + er * 0.05 + k * k * er * 0.018 + k * er * 0.07
      const h = 2 + k * 2.2
      if (y > horizon) break
      fill(ctx, '#000000', ecx - er, y, er * 2, h)
    }
    ctx.restore()
  }

  // far racks out at the edges, then the datacenter itself
  const hallW = portrait ? 380 : 560
  racks(ctx, W / 2 - hallW / 2 - 150, -ex, horizon, t, -1)
  racks(ctx, W / 2 + hallW / 2 + 150, W + ex, horizon, t, 1)
  ctx.globalAlpha = 1
  // the racks are background: dim them under a haze
  const haze = ctx.createLinearGradient(0, horizon - 180, 0, horizon)
  haze.addColorStop(0, 'rgba(0, 0, 0, 0.65)')
  haze.addColorStop(1, 'rgba(0, 0, 0, 0.25)')
  ctx.fillStyle = haze
  ctx.fillRect(-ex, horizon - 180, W / 2 - hallW / 2 + ex - 40, 180)
  ctx.fillRect(W / 2 + hallW / 2 + 40, horizon - 180, W / 2 - hallW / 2 + ex - 40, 180)
  datacenter(ctx, W, ex, horizon, hallW, portrait ? 150 : 130, t, portrait)

  // a grid floor running to the horizon
  ctx.save()
  ctx.beginPath()
  ctx.rect(-ex, horizon, W + ex * 2, floorBottom - horizon)
  ctx.clip()
  const fade = ctx.createLinearGradient(0, horizon, 0, floorBottom)
  fade.addColorStop(0, 'rgba(150, 214, 255, 0.0)')
  fade.addColorStop(1, 'rgba(150, 214, 255, 0.07)')
  ctx.fillStyle = fade
  ctx.fillRect(-ex, horizon, W + ex * 2, floorBottom - horizon)
  ctx.strokeStyle = 'rgba(150, 214, 255, 0.22)'
  ctx.lineWidth = 2
  for (let i = -14; i <= 14; i++) {
    ctx.beginPath()
    ctx.moveTo(W / 2 + i * 14, horizon)
    ctx.lineTo(W / 2 + i * 150, floorBottom)
    ctx.stroke()
  }
  const scroll = (t * 0.35) % 1
  for (let k = 0; k < 14; k++) {
    const z = (k + scroll) / 14
    const y = horizon + (floorBottom - horizon) * z * z
    ctx.globalAlpha = 0.15 + z * 0.45
    ctx.beginPath()
    ctx.moveTo(-ex, y)
    ctx.lineTo(W + ex, y)
    ctx.stroke()
  }
  ctx.restore()
  ctx.globalAlpha = 1
  fill(ctx, 'rgba(226, 245, 255, 0.75)', -ex, horizon - 1, W + ex * 2, 2)

  // the company eating its way along the horizon, RAM by RAM
  const rowY = horizon - 12
  const span = W - 120
  const u = (t * 0.1) % 1
  const px = 60 + u * span
  ctx.imageSmoothingEnabled = false
  for (let x = 60; x <= 60 + span; x += 44) {
    if (x < px + 14) continue
    stick(ctx, x, rowY, 0.8)
  }
  const sprite = pacFrameOf(form, t * 8)
  if (sprite) drawFacing(ctx, sprite, px, rowY, 40, 'right', 'right')

  // the key art and, right under it, what this game is
  const scale = portrait ? (W * 0.92) / KEY_W : 3
  const kw = KEY_W * scale
  const kh = KEY_H * scale
  const kx = W / 2 - kw / 2
  const ky = (portrait ? 34 : 0) + Math.sin(t * 1.2) * 3
  if (KEYART.complete && KEYART.naturalWidth) ctx.drawImage(KEYART, kx, ky, kw, kh)
  if (portrait) {
    const y0 = 34 + kh + 22
    shout(ctx, 'YOU ARE THE AI COMPANY.', W / 2, y0, 46, W - 60, ICE, GLOW)
    shout(ctx, 'EAT ALL THE RAM.', W / 2, y0 + 58, 54, W - 60, '#ff6fa0', ALERT)
    label(ctx, 'Every chip you take is one', W / 2, y0 + 118, 40, 'rgba(255, 210, 225, 0.95)')
    label(ctx, 'nobody else can afford.', W / 2, y0 + 154, 40, 'rgba(255, 210, 225, 0.95)')
  } else {
    const y0 = kh + 18
    shout(ctx, 'YOU ARE THE AI COMPANY.  EAT ALL THE RAM.', W / 2, y0, 40, W - 80, ICE, GLOW)
    label(ctx, 'Every chip you take is one nobody else can afford.', W / 2, y0 + 46, 38, 'rgba(255, 210, 225, 0.95)')
  }

  // the cast, then the way in: one big start button, the board, fullscreen
  if (portrait) {
    cast(ctx, W, horizon + 106, true, t, form)
    const bw = 600
    const sy = horizon + 200
    const pulse = 6 + 8 * (0.5 + 0.5 * Math.sin(t * 4))
    bigButton(ctx, frame, 'action', '\u25B6 START', W / 2 - bw / 2, sy, bw, 92, {
      face: '#1b4a75', light: '#cfeeff', edge: '#071827', ink: '#ffffff', size: 42, glow: pulse,
    })
    const ly = sy + 118
    bigButton(ctx, frame, 'board', 'TOP VALUATIONS', W / 2 - bw / 2, ly, bw, 64, {
      face: '#0a1b2e', light: '#3f6d93', edge: '#03080f', ink: GLOW, size: 24, glow: 0,
    })
    if (!view.full) fullHint(ctx, frame, view, W / 2, ly + 96, 30)
    label(ctx, 'A GAME ABOUT AI AND WHO OWNS COMPUTE', W / 2, H - 48, 32, ICE)
    label(ctx, 'An independent game. Not affiliated with or endorsed by Bandai Namco.', W / 2, H - 12, 19, 'rgba(150, 214, 255, 0.6)')
  } else {
    cast(ctx, W, horizon + 76, false, t, form)
    const sy = horizon + 146
    const bw = 420
    const ow = 330
    const gx = 20
    const x0 = W / 2 - (bw + gx + ow) / 2
    const pulse = 6 + 8 * (0.5 + 0.5 * Math.sin(t * 4))
    bigButton(ctx, frame, 'action', '\u25B6 START', x0, sy, bw, 72, {
      face: '#1b4a75', light: '#cfeeff', edge: '#071827', ink: '#ffffff', size: 34, glow: pulse,
    })
    bigButton(ctx, frame, 'board', 'TOP VALUATIONS', x0 + bw + gx, sy, ow, 72, {
      face: '#0a1b2e', light: '#3f6d93', edge: '#03080f', ink: GLOW, size: 20, glow: 0,
    })
    if (!view.full) fullHint(ctx, frame, view, W + ex - 24, 26, 24, 'right')
    label(ctx, 'PAC RAM \u00B7 A GAME ABOUT AI AND WHO OWNS COMPUTE', W / 2, H - 30, 30, ICE)
    label(ctx, 'An independent game. Not affiliated with or endorsed by Bandai Namco.', W / 2, H - 5, 16, 'rgba(150, 214, 255, 0.6)')
  }
  ctx.restore()
  return frame.hits
}

function fullHint(ctx: CanvasRenderingContext2D, frame: Frame, view: View, x: number, y: number, size: number, align: 'center' | 'right' = 'center'): void {
  ctx.font = `${size}px ${MONO}`
  const text = view.touch ? '\u2922  play fullscreen' : '\u2922  fullscreen (F)'
  const w = ctx.measureText(text).width
  label(ctx, text, x, y, size, frame.view.hover === 'full' ? ICE : GLOW, align)
  const left = align === 'right' ? x - w : x - w / 2
  hit(frame, 'full', left - 16, y - size, w + 32, size * 2)
}
