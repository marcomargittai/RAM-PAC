import { LEVELS } from './levels'
import { CAUGHT_HOLD, CLEAR_HOLD, MILESTONE_HOLD, SEAL_HOLD, visual, type Dir, type Game, type Ghost } from './sim'
import { drawFacing, lawSprite, pacFrame, type GhostLook } from './sprites'

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

const PAGE = '#f4efe2'
const PAGE_INK = '#1a1028'

export function tileSize(): number {
  return TILE
}

function snap(value: number): number {
  return Math.round(value)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function palette(surge: boolean, level: number): Palette {
  const era = Math.min(2, Math.max(0, level))
  if (era === 0) {
    if (!surge) {
      return {
        bg: '#14081f',
        wall: '#4b2a86',
        edge: '#ffb020',
        hot: '#ffe7a3',
        pcb: '#241044',
        trace: '#ffd36a',
        ceramic: '#3a1f6e',
        bevel: '#7d52c8',
        shade: '#120818',
        pin: '#c9a6ff',
        die: '#14081f',
        dieFrame: '#ffb020',
        ram: '#ffd36a',
        slot: '#120818',
        slotLip: '#ffd36a',
        pellet: '#ffd36a',
        pelletPin: '#c9a6ff',
        pelletHot: '#fff1b8',
        surgeBody: '#ffb020',
        surgeInk: '#14081f',
        surgeHalo: '#c9a6ff',
        player: '#ffe7a3',
        mark: '#c9a6ff',
      }
    }
    return {
      bg: '#14081f',
      wall: '#2a1458',
      edge: '#c9a6ff',
      hot: '#ffe7a3',
      pcb: '#3a1868',
      trace: '#c9a6ff',
      ceramic: '#4b2a86',
      bevel: '#ffb020',
      shade: '#0c0414',
      pin: '#ffd36a',
      die: '#ffe7a3',
      dieFrame: '#c9a6ff',
      ram: '#2a1458',
      slot: '#c9a6ff',
      slotLip: '#ffd36a',
      pellet: '#ffe7a3',
      pelletPin: '#c9a6ff',
      pelletHot: '#fff6d0',
      surgeBody: '#c9a6ff',
      surgeInk: '#14081f',
      surgeHalo: '#ffb020',
      player: '#ffe7a3',
      mark: '#ffb020',
    }
  }
  if (era === 1) {
    if (!surge) {
      return {
        bg: '#140014',
        wall: '#e012a0',
        edge: '#b6ff2e',
        hot: '#fff15a',
        pcb: '#3a0032',
        trace: '#b6ff2e',
        ceramic: '#ff3cbe',
        bevel: '#ff7ad2',
        shade: '#4a0040',
        pin: '#fff15a',
        die: '#140014',
        dieFrame: '#3dfff3',
        ram: '#fff15a',
        slot: '#140014',
        slotLip: '#b6ff2e',
        pellet: '#fff15a',
        pelletPin: '#3dfff3',
        pelletHot: '#fffce0',
        surgeBody: '#3dfff3',
        surgeInk: '#140014',
        surgeHalo: '#b6ff2e',
        player: '#3dfff3',
        mark: '#b6ff2e',
      }
    }
    return {
      bg: '#140014',
      wall: '#2c0028',
      edge: '#fff15a',
      hot: '#b6ff2e',
      pcb: '#e012a0',
      trace: '#3dfff3',
      ceramic: '#5a004c',
      bevel: '#3dfff3',
      shade: '#0c000a',
      pin: '#b6ff2e',
      die: '#fff15a',
      dieFrame: '#3dfff3',
      ram: '#140014',
      slot: '#3dfff3',
      slotLip: '#b6ff2e',
      pellet: '#b6ff2e',
      pelletPin: '#fff15a',
      pelletHot: '#3dfff3',
      surgeBody: '#b6ff2e',
      surgeInk: '#140014',
      surgeHalo: '#e012a0',
      player: '#3dfff3',
      mark: '#fff15a',
    }
  }
  if (!surge) {
    return {
      bg: '#071422',
      wall: '#16324a',
      edge: '#8eb6ff',
      hot: '#d5e4ff',
      pcb: '#0d2840',
      trace: '#8eb6ff',
      ceramic: '#1f4d6e',
      bevel: '#4d7eae',
      shade: '#081420',
      pin: '#ffe14a',
      die: '#071422',
      dieFrame: '#8eb6ff',
      ram: '#ffe14a',
      slot: '#081420',
      slotLip: '#8eb6ff',
      pellet: '#ffe14a',
      pelletPin: '#f7f4ea',
      pelletHot: '#fff4c2',
      surgeBody: '#c9a6ff',
      surgeInk: '#071422',
      surgeHalo: '#8eb6ff',
      player: '#f7f4ea',
      mark: '#c9a6ff',
    }
  }
  return {
    bg: '#071422',
    wall: '#10283c',
    edge: '#c9a6ff',
    hot: '#ffe14a',
    pcb: '#1a4060',
    trace: '#c9a6ff',
    ceramic: '#16324a',
    bevel: '#8eb6ff',
    shade: '#061018',
    pin: '#ffe14a',
    die: '#f7f4ea',
    dieFrame: '#c9a6ff',
    ram: '#10283c',
    slot: '#c9a6ff',
    slotLip: '#ffe14a',
    pellet: '#fff0a0',
    pelletPin: '#c9a6ff',
    pelletHot: '#ffffff',
    surgeBody: '#ffe14a',
    surgeInk: '#071422',
    surgeHalo: '#c9a6ff',
    player: '#f7f4ea',
    mark: '#8eb6ff',
  }
}

function eraOf(level: number): number {
  return Math.min(2, Math.max(0, level))
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
  const pal = palette(game.surge > 0, game.levelIndex)
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
  drawPlayer(ctx, game, tile)
  drawFx(ctx, game, tile)
  drawEraPlate(ctx, game, width)

  if (game.flash > 0.02) {
    ctx.fillStyle = `rgba(214, 255, 194, ${game.flash * 0.28})`
    ctx.fillRect(0, 0, width, height)
  }
  ctx.restore()

  if (game.mode === 'dying') drawDeathStamp(ctx, game, width, height)
  if (game.mode === 'cleared' && game.modeTimer > 0) drawClearFanfare(ctx, game, width, height)
  drawBanner(ctx, game, width, height)
  drawMilestone(ctx, game, width, height, pal)
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
  const bodyX = pen.x * tile
  const bodyY = pen.y * tile
  const bodyW = pen.w * tile
  const bodyH = pen.h * tile
  const pcbPad = 3
  const pcbX = bodyX + pcbPad
  const pcbY = bodyY + pcbPad
  const pcbW = bodyW - pcbPad * 2
  const pcbH = bodyH - pcbPad * 2

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
  const slotTop = bodyY
  const slotBottom = (door.y + 1) * tile
  const pitch = 4
  const pinW = 2
  const count = Math.max(4, Math.floor((bodyW - 8) / pitch))
  const used = count * pitch - (pitch - pinW)
  const pinStart = bodyX + Math.floor((bodyW - used) / 2)
  const pinRows = [bodyY + 2, bodyY + bodyH - pinH - 2]
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
}

function actorSize(level: number): number {
  return Math.round(32 * ([0.86, 1, 1.12][eraOf(level)] ?? 1))
}

function drawPacAt(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, dir: Dir, open: number): void {
  const frame = pacFrame(open)
  if (!frame) return
  drawFacing(ctx, frame, x, y, size, dir, 'right')
}

function drawPlayer(ctx: CanvasRenderingContext2D, game: Game, tile: number): void {
  const pos = visual(game.player)
  const moving = game.mode === 'play' && game.player.speed > 0
  const open = moving ? game.time * 12 : 0
  drawPacAt(ctx, pos.x * tile + tile / 2, pos.y * tile + tile / 2, actorSize(game.levelIndex), game.player.dir, open)
}

function drawEraPlate(ctx: CanvasRenderingContext2D, game: Game, width: number): void {
  const era = eraOf(game.levelIndex)
  const names = ['DUSK', '8-BIT', 'NOW']
  const ink = era === 0 ? '#ffb020' : era === 1 ? '#b6ff2e' : '#8eb6ff'
  const dim = era === 0 ? '#3a2068' : era === 1 ? '#5a1848' : '#16324a'
  label(ctx, `GEN ${era + 1} ${names[era]}`, 8, 14, 8, ink, 'left', 'middle')
  for (let i = 0; i < 3; i++) {
    fill(ctx, i <= era ? ink : dim, width - 36 + i * 10, 8, 8, 8)
  }
}

function ghostLook(game: Game, ghost: Ghost): GhostLook {
  if (ghost.state === 'eaten') return 'eyes'
  if (ghost.state !== 'frightened') return 'body'
  const warned = game.surge > 0 && game.surge < 2
  const flash = Math.floor(game.time * (warned ? 14 : 8) + ghost.law) % 2 === 0
  return flash ? 'flash' : 'blue'
}

function drawGhost(ctx: CanvasRenderingContext2D, game: Game, ghost: Ghost, tile: number): void {
  const pos = visual(ghost)
  const size = actorSize(game.levelIndex)
  let x = pos.x * tile + tile / 2
  let y = pos.y * tile + tile / 2
  if (ghost.state === 'eaten') y += Math.sin(game.time * 10 + ghost.law)
  else if (ghost.state === 'frightened') x += Math.sin(game.time * 18 + ghost.law) * 2
  else if (ghost.state !== 'housed') y += Math.sin(game.time * 8 + ghost.law * 2)
  const art = lawSprite(ghost.law, ghostLook(game, ghost))
  if (art) drawFacing(ctx, art, x, y, size, ghost.dir, 'up')
  label(ctx, ghost.tag, x, y - size / 2 - 8, 8, ghost.color)
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

function drawMilestone(
  ctx: CanvasRenderingContext2D,
  game: Game,
  width: number,
  height: number,
  pal: Palette,
): void {
  if (game.milestone <= 0) return
  const t = MILESTONE_HOLD - game.milestone
  const slam = clamp(t / 0.22, 0, 1)
  const scale = 1 + (1 - slam) * (1 - slam) * 1.6
  ctx.save()
  ctx.translate(snap(width / 2), snap(height * 0.42))
  ctx.scale(scale, scale)
  fill(ctx, pal.surgeHalo, -140, -40, 280, 80)
  fill(ctx, pal.surgeBody, -132, -34, 264, 68)
  fill(ctx, pal.bg, -124, -26, 248, 52)
  label(ctx, 'SURGE', 0, -4, 32, pal.surgeBody)
  label(ctx, 'REPEAL THEM', 0, 22, 8, pal.hot)
  ctx.restore()
}

function drawBanner(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number): void {
  if (game.bannerTimer <= 0 || !game.banner) return
  const y = snap(Math.min(12, height * 0.04))
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
    const left = game.lives === 1 ? '1 LIFE LEFT' : `${game.lives} LIVES LEFT`
    label(ctx, 'STILL RUNNING', width * 0.5, top + 26, 16, '#ffb000')
    label(ctx, left, width * 0.5, top + 54, 16, '#f4f0e6')
    return
  }
  label(ctx, `LEVEL ${game.levelIndex + 1}`, width * 0.5, top + 20, 8, '#5c3d8a')
  label(ctx, def?.name ?? '', width * 0.5, top + 46, 16, '#f4f0e6')
  label(ctx, def?.blurb ?? '', width * 0.5, top + 76, 8, '#ff2e93')
}

function drawLose(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number, pal: Palette): void {
  const tile = TILE
  fill(ctx, pal.bg, 0, 0, width, height)
  drawMaze(ctx, game, tile, pal)
  drawPellets(ctx, game, tile, pal)
  for (const ghost of game.ghosts) drawGhost(ctx, game, ghost, tile)
  drawPlayer(ctx, game, tile)
  const pos = visual(game.player)
  const px = snap(pos.x * tile + tile / 2)
  const py = snap(pos.y * tile + tile / 2)
  const law = game.ghosts.find((ghost) => ghost.name === game.caughtName)
  const ink = law?.color ?? '#ff2e93'
  const caught = lawSprite(law?.law ?? 0, 'body')
  if (caught) drawFacing(ctx, caught, px, py, actorSize(game.levelIndex) * 3.2, 'down', 'up')
  label(ctx, law?.tag ?? 'LAW', px, py - 62, 8, ink)

  const plateW = 308
  const plateH = game.caughtName ? 68 : 40
  const plateY = py < height * 0.42 ? height - plateH - 18 : 16
  const plateX = snap(width / 2 - plateW / 2)
  fill(ctx, PAGE, plateX, plateY, plateW, plateH)
  fill(ctx, ink, plateX, plateY, plateW, 5)
  fill(ctx, ink, plateX, plateY, 5, plateH)
  fill(ctx, PAGE_INK, plateX, plateY + plateH - 2, plateW, 2)
  fill(ctx, PAGE_INK, plateX + plateW - 2, plateY, 2, plateH)
  label(ctx, 'A LAW CAUGHT YOU', width / 2, plateY + 24, 16, PAGE_INK)
  if (game.caughtName) label(ctx, game.caughtName.toUpperCase(), width / 2, plateY + 48, 16, ink)
}
