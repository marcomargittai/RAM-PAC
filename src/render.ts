import { LEVELS } from './levels'
import { CAUGHT_HOLD, CLEAR_HOLD, SEAL_HOLD, WIN_CUT_AT, visual, type Dir, type Game, type Ghost } from './sim'

const TILE = 40
const PIXEL = '"Press Start 2P", monospace'

type Px = 8 | 16 | 24 | 32 | 48 | 64

interface Palette {
  bg: string
  wall: string
  edge: string
  hot: string
  pcb: string
  trace: string
  ceramic: string
  bevel: string
  shade: string
  pin: string
  die: string
  dieFrame: string
  ram: string
  slot: string
  slotLip: string
  pellet: string
  pelletPin: string
  pelletHot: string
  surgeBody: string
  surgeInk: string
  surgeHalo: string
  player: string
  mark: string
}

const STATUE: ReadonlyArray<readonly [number, number, number, number]> = [
  [-3, -12, 6, 3],
  [-4, -9, 8, 5],
  [-8, -4, 16, 3],
  [-6, -1, 12, 7],
  [-8, 6, 16, 4],
  [-6, 10, 12, 2],
]

const EYES: ReadonlyArray<readonly [number, number, number, number]> = [
  [-3, -7, 2, 2],
  [1, -7, 2, 2],
]

const AI_ROWS = ['11101', '10101', '11101', '10101', '10101']

export function tileSize(): number {
  return TILE
}

function snap(value: number): number {
  return Math.round(value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function palette(surge: boolean): Palette {
  if (!surge) {
    return {
      bg: '#100818',
      wall: '#1a1030',
      edge: '#3ad7ff',
      hot: '#ffb000',
      pcb: '#140c28',
      trace: '#3ad7ff',
      ceramic: '#2a1848',
      bevel: '#5a3d88',
      shade: '#07040f',
      pin: '#ffb000',
      die: '#07040f',
      dieFrame: '#3ad7ff',
      ram: '#ffb000',
      slot: '#07040f',
      slotLip: '#ffb000',
      pellet: '#c47e00',
      pelletPin: '#ffb000',
      pelletHot: '#ffe08a',
      surgeBody: '#ff2e93',
      surgeInk: '#100818',
      surgeHalo: '#ffd0ea',
      player: '#f4f0e6',
      mark: '#3ad7ff',
    }
  }
  return {
    bg: '#2a0820',
    wall: '#100818',
    edge: '#ff2e93',
    hot: '#ffb000',
    pcb: '#3a1030',
    trace: '#ff2e93',
    ceramic: '#1a0820',
    bevel: '#ff2e93',
    shade: '#07040f',
    pin: '#ffb000',
    die: '#ffd0ea',
    dieFrame: '#ffb000',
    ram: '#100818',
    slot: '#ff2e93',
    slotLip: '#ffb000',
    pellet: '#ffb000',
    pelletPin: '#100818',
    pelletHot: '#ffe08a',
    surgeBody: '#ffb000',
    surgeInk: '#100818',
    surgeHalo: '#ff2e93',
    player: '#f4f0e6',
    mark: '#ff2e93',
  }
}

function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color
  ctx.fillRect(snap(x), snap(y), snap(w), snap(h))
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: Px,
  color: string,
  align: CanvasTextAlign = 'center',
  baseline: CanvasTextBaseline = 'middle',
): void {
  ctx.fillStyle = color
  ctx.font = `${size}px ${PIXEL}`
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillText(text, snap(x), snap(y))
}

function phosphorColor(color: string): string {
  switch (color) {
    case '#ff4d6a':
    case '#e23d5c':
    case '#9d1228':
      return '#ff2e93'
    case '#f4f1e4':
    case '#f4efe2':
    case '#f7f1e4':
    case '#7dffe1':
      return '#f4f0e6'
    case '#d9c7a2':
    case '#e3b341':
    case '#dffc6a':
      return '#ffb000'
    case '#7c5cff':
      return '#5c3d8a'
    case '#1f9d8a':
      return '#ff2e93'
    default:
      return color
  }
}

function wallAt(maze: Game['maze'], x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= maze.w || y >= maze.h) return false
  return maze.rows[y]![x] === '#'
}

function penBox(maze: Game['maze']): { x: number; y: number; w: number; h: number } | null {
  let minX = maze.w
  let minY = maze.h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < maze.h; y++) {
    const row = maze.rows[y]!
    for (let x = 0; x < maze.w; x++) {
      const ch = row[x]
      if (ch !== 'G' && ch !== 'd') continue
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }
  if (maxX < 0) return null
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
}

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.imageSmoothingEnabled = false
  ctx.globalAlpha = 1
  const tile = TILE
  const width = game.maze.w * tile
  const height = game.maze.h * tile
  const pal = palette(game.surge > 0)
  const cinematic = game.mode === 'win'
  if (cinematic) {
    drawWin(ctx, game, width, height, pal)
    return
  }
  if (game.mode === 'lose') {
    drawLose(ctx, game, width, height, pal)
    return
  }

  fill(ctx, pal.bg, 0, 0, width, height)

  ctx.save()
  if (game.shake > 0.4) {
    const mag = game.shake
    ctx.translate(snap((Math.random() - 0.5) * mag), snap((Math.random() - 0.5) * mag))
  }

  drawMaze(ctx, game, tile, pal)
  drawPellets(ctx, game, tile, pal)
  for (const ghost of game.ghosts) drawGhost(ctx, game, ghost, tile)
  drawPlayer(ctx, game, tile, pal)
  drawFx(ctx, game, tile)

  if (game.mode === 'dying') fill(ctx, 'rgba(0, 0, 0, 0.4)', 0, 0, width, height)

  if (game.flash > 0.02) {
    ctx.fillStyle = `rgba(214, 255, 194, ${game.flash * 0.28})`
    ctx.fillRect(0, 0, width, height)
  }
  ctx.restore()

  if (game.mode === 'dying') drawDeathStamp(ctx, game, width, height)
  if (game.mode === 'cleared' && game.modeTimer > 0) drawClearFanfare(ctx, game, width, height)
  drawBanner(ctx, game, width, height)

  if (game.mode === 'title') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)'
    ctx.fillRect(0, 0, width, snap(height * 0.58))
    drawTitleGag(ctx, game, width, height, pal)
  }
}

function drawMaze(ctx: CanvasRenderingContext2D, game: Game, tile: number, pal: Palette): void {
  const { maze } = game
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      if (!wallAt(maze, x, y)) continue
      const x0 = x * tile
      const y0 = y * tile
      fill(ctx, pal.wall, x0, y0, tile, tile)
      if (!wallAt(maze, x, y - 1)) {
        fill(ctx, pal.edge, x0, y0, tile, 2)
        fill(ctx, pal.hot, x0, y0, tile, 1)
      }
      if (!wallAt(maze, x, y + 1)) {
        fill(ctx, pal.edge, x0, y0 + tile - 2, tile, 2)
        fill(ctx, pal.hot, x0, y0 + tile - 1, tile, 1)
      }
      if (!wallAt(maze, x - 1, y)) {
        fill(ctx, pal.edge, x0, y0, 2, tile)
        fill(ctx, pal.hot, x0, y0, 1, tile)
      }
      if (!wallAt(maze, x + 1, y)) {
        fill(ctx, pal.edge, x0 + tile - 2, y0, 2, tile)
        fill(ctx, pal.hot, x0 + tile - 1, y0, 1, tile)
      }
    }
  }
  drawRamPackage(ctx, maze, tile, pal)
}

function drawRamPackage(ctx: CanvasRenderingContext2D, maze: Game['maze'], tile: number, pal: Palette): void {
  const pen = penBox(maze)
  if (!pen) return
  const pinH = 5
  const bodyX = (pen.x - 1) * tile
  const bodyY = pen.y * tile
  const bodyW = (pen.w + 2) * tile
  const bodyH = (pen.h + 1) * tile
  const pcbPad = 3
  const pcbX = bodyX - pcbPad
  const pcbY = bodyY - pinH - pcbPad
  const pcbW = bodyW + pcbPad * 2
  const pcbH = bodyH + pinH * 2 + pcbPad * 2

  fill(ctx, pal.pcb, pcbX, pcbY, pcbW, pcbH)
  fill(ctx, pal.trace, pcbX + 2, pcbY + 2, pcbW - 4, 1)
  fill(ctx, pal.trace, pcbX + 2, pcbY + pcbH - 3, pcbW - 4, 1)
  fill(ctx, pal.trace, pcbX + 2, pcbY + 2, 1, pcbH - 4)
  fill(ctx, pal.trace, pcbX + pcbW - 3, pcbY + 2, 1, pcbH - 4)
  fill(ctx, pal.pin, pcbX + 3, pcbY + 4, 2, 2)
  fill(ctx, pal.pin, pcbX + pcbW - 6, pcbY + 4, 2, 2)
  fill(ctx, pal.pin, pcbX + 3, pcbY + pcbH - 7, 2, 2)
  fill(ctx, pal.pin, pcbX + pcbW - 6, pcbY + pcbH - 7, 2, 2)

  fill(ctx, pal.ceramic, bodyX, bodyY, bodyW, bodyH)
  fill(ctx, pal.bevel, bodyX, bodyY, bodyW, 2)
  fill(ctx, pal.bevel, bodyX, bodyY, 2, bodyH)
  fill(ctx, pal.shade, bodyX, bodyY + bodyH - 2, bodyW, 2)
  fill(ctx, pal.shade, bodyX + bodyW - 2, bodyY, 2, bodyH)
  fill(ctx, pal.hot, bodyX + 2, bodyY, bodyW - 4, 1)

  const door = maze.door
  const slotW = tile - 10
  const slotX = door.x * tile + 5
  const slotTop = bodyY - pinH
  const slotBottom = (door.y + 1) * tile
  const pitch = 4
  const pinW = 2
  const count = Math.max(4, Math.floor((bodyW - 8) / pitch))
  const used = count * pitch - (pitch - pinW)
  const pinStart = bodyX + Math.floor((bodyW - used) / 2)
  const pinRows = [bodyY - pinH, bodyY + bodyH]
  for (const pinY of pinRows) {
    const topRow = pinY < bodyY
    for (let i = 0; i < count; i++) {
      const px = pinStart + i * pitch
      if (topRow && px + pinW > slotX - 2 && px < slotX + slotW + 2) continue
      fill(ctx, pal.pin, px, pinY, pinW, pinH)
    }
  }

  const dieW = Math.min(bodyW - 16, 88)
  const dieH = 16
  const dieX = bodyX + Math.floor((bodyW - dieW) / 2)
  const dieY = bodyY + bodyH - dieH - 6
  fill(ctx, pal.dieFrame, dieX, dieY, dieW, dieH)
  fill(ctx, pal.die, dieX + 1, dieY + 1, dieW - 2, dieH - 2)
  fill(ctx, pal.pin, dieX + 3, dieY + 4, 2, 2)
  fill(ctx, pal.pin, dieX + dieW - 5, dieY + 4, 2, 2)
  label(ctx, 'RAM', dieX + dieW / 2, dieY + dieH / 2 + 1, 8, pal.ram)

  fill(ctx, pal.slot, slotX, slotTop, slotW, slotBottom - slotTop)
  fill(ctx, pal.slotLip, slotX - 2, slotTop - 2, 2, slotBottom - slotTop + 2)
  fill(ctx, pal.slotLip, slotX + slotW, slotTop - 2, 2, slotBottom - slotTop + 2)
  fill(ctx, pal.slotLip, slotX, slotBottom - 2, slotW, 2)
}

function drawPellets(ctx: CanvasRenderingContext2D, game: Game, tile: number, pal: Palette): void {
  for (const dot of game.dots) {
    const x = snap(dot.x * tile + tile / 2)
    const y = snap(dot.y * tile + tile / 2)
    const callout =
      game.mode === 'play' && game.intro > 0 && game.callouts.some((chip) => chip.x === dot.x && chip.y === dot.y)
    ctx.save()
    ctx.globalAlpha = 0.45
    fill(ctx, pal.pelletHot, x - 5, y - 5, 10, 8)
    ctx.restore()
    fill(ctx, pal.pelletPin, x - 3, y - 5, 2, 2)
    fill(ctx, pal.pelletPin, x + 1, y - 5, 2, 2)
    fill(ctx, pal.pellet, x - 4, y - 3, 8, 4)
    fill(ctx, pal.pelletHot, x - 4, y - 3, 8, 1)
    if (callout) {
      const ink = game.surge > 0 ? '#000000' : '#f4f0e6'
      label(ctx, 'RAM', x + 1, y - 9, 8, '#000000')
      label(ctx, 'RAM', x, y - 10, 8, ink)
    }
  }
  const last = game.levelIndex === LEVELS.length - 1
  for (const cherry of game.cherries) {
    drawSurgeChip(ctx, cherry.x * tile + tile / 2, cherry.y * tile + tile / 2, game.time, last, pal, game.maze.w * tile)
  }
}

function drawSurgeChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  time: number,
  last: boolean,
  pal: Palette,
  canvasW: number,
): void {
  const text = last ? 'LAST SURGE' : 'SURGE'
  const bodyW = text.length * 8 + 8
  const bodyH = 14
  const pinH = 3
  let left = snap(x - bodyW / 2)
  const top = snap(y - bodyH / 2)
  if (left < 2) left = 2
  if (left + bodyW > canvasW - 2) left = canvasW - 2 - bodyW
  if (Math.floor(time * 7) % 2 === 0) fill(ctx, pal.surgeHalo, left - 2, top - pinH - 2, bodyW + 4, bodyH + pinH + 4)
  const pitch = 6
  const pins = Math.max(3, Math.floor((bodyW - 8) / pitch))
  const used = pins * pitch - 2
  const pinX = left + Math.floor((bodyW - used) / 2)
  for (let i = 0; i < pins; i++) fill(ctx, pal.pin, pinX + i * pitch, top - pinH, 2, pinH)
  fill(ctx, pal.surgeBody, left, top, bodyW, bodyH)
  fill(ctx, pal.surgeHalo, left, top, bodyW, 1)
  label(ctx, text, left + bodyW / 2, top + bodyH / 2 + 1, 8, pal.surgeInk)
}

function inMouth(x: number, y: number, dir: Dir, mouth: number): boolean {
  let forward = x
  let side = y
  if (dir === 'left') forward = -x
  else if (dir === 'down') {
    forward = y
    side = x
  } else if (dir === 'up') {
    forward = -y
    side = x
  }
  return forward > 1 && Math.abs(side) < forward * mouth
}

function drawChomp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  dir: Dir,
  mouth: number,
  color: string,
  mark: string | null,
  markPx: number,
): void {
  const r = Math.max(4, snap(radius))
  const ox = snap(x)
  const oy = snap(y)
  const step = 2
  ctx.fillStyle = color
  for (let py = -r; py <= r; py += step) {
    const limit = Math.floor(Math.sqrt(r * r - py * py))
    let run: number | null = null
    for (let px = -limit; px <= limit + 1; px++) {
      const draw = px <= limit && !inMouth(px, py, dir, mouth)
      if (draw && run === null) run = px
      if (!draw && run !== null) {
        ctx.fillRect(ox + run, oy + py, px - run, step)
        run = null
      }
    }
  }
  if (mark) drawAiMark(ctx, ox, oy, dir, mark, markPx)
}

function drawAiMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: Dir, color: string, px: number): void {
  const w = AI_ROWS[0]!.length * px
  const h = AI_ROWS.length * px
  let ox = cx
  let oy = cy
  if (dir === 'right') {
    ox = cx - w - px
    oy = cy - Math.floor(h / 2)
  } else if (dir === 'left') {
    ox = cx + px
    oy = cy - Math.floor(h / 2)
  } else if (dir === 'up') {
    ox = cx - Math.floor(w / 2)
    oy = cy + px
  } else {
    ox = cx - Math.floor(w / 2)
    oy = cy - h - px
  }
  ctx.fillStyle = color
  for (let y = 0; y < AI_ROWS.length; y++) {
    const row = AI_ROWS[y]!
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '1') continue
      ctx.fillRect(ox + x * px, oy + y * px, px, px)
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, game: Game, tile: number, pal: Palette): void {
  const pos = visual(game.player)
  const x = pos.x * tile + tile / 2
  const y = pos.y * tile + tile / 2
  const moving = game.mode === 'play' && game.player.speed > 0
  const mouth = moving ? 0.14 + Math.abs(Math.sin(game.time * 14)) * 0.55 : 0.16
  drawChomp(ctx, x, y, 14, game.player.dir, mouth, pal.player, pal.mark, 2)
}

function fillBlocks(
  ctx: CanvasRenderingContext2D,
  blocks: ReadonlyArray<readonly [number, number, number, number]>,
  color: string,
  inflate: number,
): void {
  ctx.fillStyle = color
  for (const [x, y, w, h] of blocks) {
    ctx.fillRect(x - inflate, y - inflate, w + inflate * 2, h + inflate * 2)
  }
}

function drawHollowPins(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.globalAlpha = 0.5
  ctx.fillStyle = color
  const x = -6
  const y = -4
  const w = 12
  const h = 8
  ctx.fillRect(x, y, w, 1)
  ctx.fillRect(x, y + h - 1, w, 1)
  ctx.fillRect(x, y, 1, h)
  ctx.fillRect(x + w - 1, y, 1, h)
  for (const px of [-4, -1, 2]) {
    ctx.fillRect(px, y - 3, 2, 3)
    ctx.fillRect(px, y + h, 2, 3)
  }
  ctx.globalAlpha = 1
}

function drawGhost(ctx: CanvasRenderingContext2D, game: Game, ghost: Ghost, tile: number): void {
  const pos = visual(ghost)
  const x = snap(pos.x * tile + tile / 2)
  const y = snap(pos.y * tile + tile / 2)
  const look = {
    body: game.surge > 0 ? '#100818' : ghost.color,
    stripe: game.surge > 0 ? '#ffb000' : '#f4f0e6',
    ink: game.surge > 0 ? '#ffb000' : '#100818',
  }
  ctx.save()
  ctx.translate(x, y)
  if (ghost.state === 'eaten') {
    ctx.translate(0, Math.round(Math.sin(game.time * 10 + ghost.law)))
    drawHollowPins(ctx, game.surge > 0 ? '#ff2e93' : '#ffb000')
    ctx.restore()
    return
  }

  const frightened = ghost.state === 'frightened'
  if (frightened) ctx.translate(snap(Math.sin(game.time * 18 + ghost.law) * 2), 0)
  if (frightened) {
    const phase = Math.floor(game.time * 8 + ghost.law) % 2 === 0
    fillBlocks(ctx, STATUE, phase ? '#ff2e93' : '#3ad7ff', 2)
    fillBlocks(ctx, STATUE, phase ? '#100818' : '#1a1030', 0)
    ctx.fillStyle = phase ? '#ffb000' : '#f4f0e6'
    for (const eye of EYES) ctx.fillRect(eye[0], eye[1], eye[2], eye[3])
    label(ctx, ghost.tag, 0, -18, 8, '#ffb000')
  } else {
    fillBlocks(ctx, STATUE, '#000000', 1)
    fillBlocks(ctx, STATUE, look.body, 0)
    ctx.fillStyle = look.stripe
    ctx.fillRect(-8, -4, 2, 14)
    ctx.fillStyle = '#000000'
    for (const eye of EYES) ctx.fillRect(eye[0], eye[1], eye[2], eye[3])
    label(ctx, ghost.tag, 0, -18, 8, look.ink)
  }
  ctx.restore()
}

function drawPerson(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  wave: number,
  scale: number,
  sign: boolean,
): void {
  if (scale <= 0.02) return
  const u = Math.max(1, snap(scale * 2))
  const x0 = snap(x)
  const y0 = snap(y)
  const arm = snap(wave * 2) * u
  fill(ctx, '#f4f0e6', x0 - u, y0 - 16 * u, 2 * u, 2 * u)
  fill(ctx, '#f4f0e6', x0 - u, y0 - 14 * u, 2 * u, 5 * u)
  fill(ctx, '#f4f0e6', x0 - 4 * u, y0 - 13 * u + arm, 3 * u, u)
  fill(ctx, '#f4f0e6', x0 + u, y0 - 13 * u - arm, 3 * u, u)
  fill(ctx, '#ff2e93', x0 - 2 * u, y0 - 9 * u, u, 4 * u)
  fill(ctx, '#ff2e93', x0 + u, y0 - 9 * u, u, 4 * u)
  if (!sign || scale <= 0.75) return
  const sx = x0 + 4 * u
  const sy = y0 - 20 * u
  fill(ctx, '#5c3d8a', sx, sy, 22, 14)
  fill(ctx, '#ffb000', sx + 1, sy + 1, 20, 12)
  label(ctx, 'HI', sx + 11, sy + 8, 8, '#100818')
}

function drawTitleGag(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number, pal: Palette): void {
  const mouthX = snap(width * 0.3)
  const mouthY = snap(height * 0.72)
  const chomp = 0.28 + Math.abs(Math.sin(game.time * 6)) * 0.5
  drawChomp(ctx, mouthX, mouthY, 42, 'right', chomp, pal.player, pal.mark, 3)
  const span = width * 0.62
  for (let i = 0; i < 6; i++) {
    const travel = (game.time * 42 + i * (span / 6)) % span
    const x = mouthX + span - travel
    if (x < mouthX + 20) continue
    drawPerson(ctx, x, mouthY + 8, Math.sin(game.time * 8 + i), 1, i === 4)
  }
}

function drawClearFanfare(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number): void {
  const t = CLEAR_HOLD - game.modeTimer
  const flash = clamp(1 - t / 0.22, 0, 1)
  if (flash > 0) fill(ctx, `rgba(255, 224, 138, ${flash * 0.72})`, 0, 0, width, height)

  const pos = visual(game.player)
  const cx = pos.x * TILE + TILE / 2
  const cy = pos.y * TILE + TILE / 2
  const rings: Array<[number, string]> = [
    [0.05, '#ffb000'],
    [0.2, '#3ad7ff'],
    [0.38, '#ff2e93'],
  ]
  for (const [delay, color] of rings) {
    const u = clamp((t - delay) / 0.9, 0, 1)
    if (u <= 0) continue
    const r = 10 + u * 78
    const alpha = 1 - u
    ctx.globalAlpha = alpha
    fill(ctx, color, cx - r, cy - r, r * 2, 3)
    fill(ctx, color, cx - r, cy + r - 3, r * 2, 3)
    fill(ctx, color, cx - r, cy - r, 3, r * 2)
    fill(ctx, color, cx + r - 3, cy - r, 3, r * 2)
  }
  ctx.globalAlpha = 1

  const bits = ['#ffb000', '#3ad7ff', '#ff2e93', '#f4f0e6']
  for (let i = 0; i < 28; i++) {
    const x = ((i * 47 + t * (36 + (i % 5) * 14)) % (width + 20)) - 10
    const y = ((i * 29 + t * (48 + (i % 7) * 12)) % (height + 30)) - 16
    fill(ctx, bits[i % bits.length]!, x, y, i % 3 === 0 ? 5 : 3, i % 3 === 0 ? 5 : 3)
  }

  const slam = clamp(t / 0.28, 0, 1)
  const scale = 1 + (1 - slam) * (1 - slam) * 1.8
  ctx.save()
  ctx.translate(snap(width / 2), snap(height * 0.4))
  ctx.scale(scale, scale)
  fill(ctx, '#ffb000', -118, -28, 236, 56)
  fill(ctx, '#100818', -112, -22, 224, 44)
  label(ctx, 'CLEAR', 0, 2, 32, '#ffb000')
  ctx.restore()

  if (t > 0.32) {
    const name = LEVELS[game.levelIndex]?.name ?? ''
    fill(ctx, '#100818', width / 2 - 140, height * 0.4 + 36, 280, 28)
    label(ctx, name.toUpperCase(), width / 2, height * 0.4 + 50, 16, '#f4f0e6')
  }
}

function drawBanner(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number): void {
  if (game.bannerTimer <= 0 || !game.banner) return
  const y = snap(height * 0.4)
  fill(ctx, '#000000', 0, y, width, 32)
  fill(ctx, '#ff2e93', 0, y, width, 2)
  fill(ctx, '#ff2e93', 0, y + 30, width, 2)
  label(ctx, game.banner, width / 2, y + 17, 8, '#ff2e93')
}

function drawDeathStamp(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number): void {
  const hold = game.lives <= 1 ? SEAL_HOLD : CAUGHT_HOLD
  const elapsed = hold - game.modeTimer
  const slam = clamp(elapsed / 0.26, 0, 1)
  const scale = 1 + (1 - slam) * (1 - slam) * 1.7
  if (game.lives <= 1) {
    const pos = visual(game.player)
    drawSeal(ctx, pos.x * TILE + TILE / 2, pos.y * TILE + TILE / 2, scale)
    return
  }
  ctx.save()
  ctx.translate(snap(width / 2), snap(height / 2))
  ctx.scale(scale, scale)
  fill(ctx, '#ff2e93', -112, -24, 224, 48)
  fill(ctx, '#000000', -108, -20, 216, 40)
  label(ctx, 'CAUGHT', 0, 2, 32, '#ff2e93')
  ctx.restore()
}

function drawSeal(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.save()
  ctx.translate(snap(x), snap(y))
  ctx.scale(scale, scale)
  fill(ctx, '#ff2e93', -54, -18, 108, 36)
  fill(ctx, '#000000', -50, -14, 100, 28)
  fill(ctx, '#5c3d8a', -48, -12, 96, 24)
  fill(ctx, '#100818', -46, -10, 92, 20)
  label(ctx, 'REGULATED', 0, 1, 8, '#f4f0e6')
  ctx.restore()
}

function drawFx(ctx: CanvasRenderingContext2D, game: Game, tile: number): void {
  const surge = game.surge > 0
  for (const particle of game.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max)
    const x = snap(particle.x * tile + tile / 2)
    const y = snap(particle.y * tile + tile / 2)
    const size = Math.max(1, snap(particle.size * tile))
    fill(ctx, surge ? '#000000' : phosphorColor(particle.color), x, y, size, size)
  }
  ctx.globalAlpha = 1
  for (const note of game.popups) {
    ctx.globalAlpha = Math.max(0, note.life)
    const x = note.x * tile + tile / 2
    const y = note.y * tile
    label(ctx, note.text, x + 1, y + 1, 8, surge ? '#f4f0e6' : '#000000')
    label(ctx, note.text, x, y, 8, surge ? '#000000' : phosphorColor(note.color))
  }
  ctx.globalAlpha = 1
  if (game.mode !== 'ready') return
  const def = LEVELS[game.levelIndex]
  const caught = game.entry === 'caught'
  const width = game.maze.w * tile
  const band = caught ? 78 : 100
  const top = snap(game.maze.h * tile * 0.3)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.88)'
  ctx.fillRect(0, top, width, band)
  fill(ctx, '#ff2e93', 0, top, width, 2)
  fill(ctx, '#ff2e93', 0, top + band - 2, width, 2)
  if (caught) {
    label(ctx, 'NEW WEIGHTS', width * 0.5, top + 26, 16, '#ffb000')
    label(ctx, def?.name ?? '', width * 0.5, top + 54, 16, '#f4f0e6')
    return
  }
  label(ctx, `LEVEL ${game.levelIndex + 1}`, width * 0.5, top + 20, 8, '#5c3d8a')
  label(ctx, def?.name ?? '', width * 0.5, top + 46, 16, '#f4f0e6')
  label(ctx, def?.blurb ?? '', width * 0.5, top + 76, 8, '#ff2e93')
}

function drawScrap(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  const x0 = snap(x)
  const y0 = snap(y)
  fill(ctx, '#5c3d8a', x0, y0, 28, 10)
  fill(ctx, '#3a2460', x0, y0, 8, 10)
  fill(ctx, '#000000', x0 + 3, y0 + 3, 2, 2)
  fill(ctx, '#ffb000', x0 + 10, y0 + 4, 12, 2)
  fill(ctx, '#100818', x0 + 28, y0 - 2, 8, 14)
  fill(ctx, '#ff2e93', x0 + 28, y0 - 2, 8, 2)
}

function drawWin(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number, pal: Palette): void {
  const tile = TILE
  const t = game.ending
  fill(ctx, '#000000', 0, 0, width, height)

  if (t >= WIN_CUT_AT) {
    label(ctx, 'AGI', width / 2, height / 2 - 18, 64, '#f4f0e6')
    label(ctx, 'HUMANITY DIES', width / 2, height / 2 + 36, 16, '#ff2e93')
    drawScrap(ctx, width - 64, height - 40)
    return
  }

  const fold = clamp((t - 0.12) / 1.55, 0, 1)
  const cx = snap(width / 2)
  const cy = snap(height / 2)
  ctx.save()
  ctx.translate(cx, cy)
  const shrink = 1 - fold * 0.96
  ctx.scale(shrink, shrink)
  ctx.translate(-cx, -cy)
  ctx.globalAlpha = 1 - fold * 0.8
  fill(ctx, pal.bg, 0, 0, width, height)
  drawMaze(ctx, game, tile, pal)
  drawPellets(ctx, game, tile, pal)
  for (const ghost of game.ghosts) drawGhost(ctx, game, ghost, tile)
  ctx.restore()

  const chomp = 0.2 + Math.abs(Math.sin(game.time * 11)) * 0.5
  const radius = tile * 0.5 + fold * Math.hypot(width, height) * 0.48
  const mark = radius < 90 ? pal.mark : null
  drawChomp(ctx, cx, cy, radius, 'right', chomp, pal.player, mark, radius > 36 ? 3 : 2)

  if (t < 0.8) {
    const pos = visual(game.player)
    ctx.globalAlpha = 1 - t / 0.8
    label(ctx, 'AGI', pos.x * tile + tile / 2, pos.y * tile - 10 - t * 36, 16, '#ff2e93')
    ctx.globalAlpha = 1
  }

  if (t > 1.4) {
    const count = 7
    for (let i = 0; i < count; i++) {
      const hi = i === count - 1
      const begin = hi ? 2.15 : 1.5
      const dur = hi ? 0.95 : 1.05
      const u = clamp((t - begin) / dur, 0, 1)
      if (u >= 1) continue
      const sx = ((i + 0.5) / count) * width
      const sy = height * 0.74
      drawPerson(ctx, sx + (cx - sx) * u, sy + (cy - sy) * u, Math.sin(t * 10 + i), 1 - u, hi)
    }
  }

  drawFx(ctx, game, tile)
}

function drawLose(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number, pal: Palette): void {
  const tile = TILE
  fill(ctx, pal.bg, 0, 0, width, height)
  drawMaze(ctx, game, tile, pal)
  drawPellets(ctx, game, tile, pal)
  for (const ghost of game.ghosts) drawGhost(ctx, game, ghost, tile)
  const pos = visual(game.player)
  drawSeal(ctx, pos.x * tile + tile / 2, pos.y * tile + tile / 2, 1)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
  ctx.fillRect(0, 0, width, height)

  const count = 7
  for (let i = 0; i < count; i++) {
    const slot = 40 + i * ((width - 80) / (count - 1))
    const u = clamp((game.ending - i * 0.1) / 1.5, 0, 1)
    const eased = 1 - (1 - u) ** 3
    const x = width + 36 + (slot - width - 36) * eased
    const wave = u >= 1 ? Math.sin(game.time * 7 + i) : 0
    drawPerson(ctx, x, height * 0.78, wave, 1, i === 3)
  }
}
