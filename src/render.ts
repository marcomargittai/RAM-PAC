import { LEVELS } from './levels'
import { CAUGHT_HOLD, CLEAR_HOLD, MILESTONE_HOLD, SEAL_HOLD, visual, type Dir, type Game, type Ghost } from './sim'
import { ALERT, FRIGHT, GLOW, ICE, VOID, eraOf, theme, type Theme } from './palette'
import { drawFacing, lawSprite, pacFrame, type GhostLook } from './sprites'

const TILE = 40
export const MONO = '"VT323", "Share Tech Mono", ui-monospace, monospace'
export const DISPLAY = '"Orbitron", "Chakra Petch", sans-serif'

let actorsHidden = false

// The finale freezes the board without the actors; PAC-7 is drawn on its own.
export function hideActors(hidden: boolean): void {
  actorsHidden = hidden
}

export function tileSize(): number {
  return TILE
}

function snap(value: number): number {
  return Math.round(value)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function fill(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color
  ctx.fillRect(snap(x), snap(y), snap(w), snap(h))
}

export function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = 'center',
  baseline: CanvasTextBaseline = 'middle',
  font: string = MONO,
): void {
  ctx.fillStyle = color
  ctx.font = `${size}px ${font}`
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillText(text, snap(x), snap(y))
}

export function headline(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color: string): void {
  ctx.fillStyle = color
  ctx.font = `italic 900 ${size}px ${DISPLAY}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, snap(x), snap(y))
}

export function hatch(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number, gap = 6): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.strokeStyle = color
  ctx.lineWidth = gap / 2.4
  ctx.beginPath()
  for (let i = -h; i < w + h; i += gap) {
    ctx.moveTo(x + i, y + h)
    ctx.lineTo(x + i + h, y)
  }
  ctx.stroke()
  ctx.restore()
}

export function brackets(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number, len = 10, t = 2): void {
  fill(ctx, color, x, y, len, t)
  fill(ctx, color, x, y, t, len)
  fill(ctx, color, x + w - len, y, len, t)
  fill(ctx, color, x + w - t, y, t, len)
  fill(ctx, color, x, y + h - t, len, t)
  fill(ctx, color, x, y + h - len, t, len)
  fill(ctx, color, x + w - len, y + h - t, len, t)
  fill(ctx, color, x + w - t, y + h - len, t, len)
}

export function panel(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = 'rgba(1, 4, 11, 0.9)'
  ctx.fillRect(snap(x), snap(y), snap(w), snap(h))
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.strokeRect(snap(x) + 0.5, snap(y) + 0.5, snap(w) - 1, snap(h) - 1)
  brackets(ctx, color, x - 5, y - 5, w + 10, h + 10, 12, 2)
}

export function tag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, bg: string, ink: string, bar = ALERT): void {
  ctx.font = `${size}px ${MONO}`
  const w = Math.ceil(ctx.measureText(text).width) + size
  const h = Math.round(size * 1.05)
  const left = snap(x - w / 2)
  const top = snap(y - h / 2)
  fill(ctx, bg, left, top, w, h)
  fill(ctx, bar, left - 4, top, 4, h)
  label(ctx, text, x, y + 1, size, ink)
}

export function warning(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(2, size / 9)
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(x, y - size / 2)
  ctx.lineTo(x + size / 2, y + size / 2.4)
  ctx.lineTo(x - size / 2, y + size / 2.4)
  ctx.closePath()
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fillRect(snap(x - 1.5), snap(y - size / 6), 3, snap(size / 3.2))
  ctx.fillRect(snap(x - 1.5), snap(y + size / 4.2), 3, 3)
  ctx.restore()
}

function phosphorColor(color: string, th: Theme): string {
  switch (color) {
    case '#ff4d6a':
    case '#e23d5c':
    case '#9d1228':
      return ALERT
    case '#f4f1e4':
    case '#f4efe2':
    case '#f7f1e4':
    case '#7dffe1':
      return ICE
    case '#d9c7a2':
    case '#ffb000':
      return th.pellet
    case '#e3b341':
    case '#dffc6a':
    case '#ffe7a3':
      return th.pelletHot
    case '#3ad7ff':
    case '#1f9d8a':
    case '#7c5cff':
      return th.line
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

let layer: HTMLCanvasElement | null = null
let layerKey = ''

function mazeLayer(ctx: CanvasRenderingContext2D, game: Game, th: Theme, width: number, height: number): HTMLCanvasElement {
  const scale = ctx.getTransform().a || 1
  const fonts = document.fonts?.status ?? 'loaded'
  const key = `${th.name}:${game.levelIndex}:${game.maze.rows.join('')}:${scale}:${fonts}`
  if (layer && layerKey === key) return layer
  layer = layer ?? document.createElement('canvas')
  layer.width = Math.floor(width * scale)
  layer.height = Math.floor(height * scale)
  const lc = layer.getContext('2d')!
  lc.setTransform(scale, 0, 0, scale, 0, 0)
  lc.imageSmoothingEnabled = false
  paintMaze(lc, game, th, width, height)
  layerKey = key
  return layer
}

function paintMaze(ctx: CanvasRenderingContext2D, game: Game, th: Theme, width: number, height: number): void {
  const { maze } = game
  const tile = TILE
  fill(ctx, th.bg, 0, 0, width, height)

  for (let y = 0; y <= maze.h; y++) {
    for (let x = 0; x <= maze.w; x++) {
      fill(ctx, th.grid, x * tile - 1, y * tile - 1, 2, 2)
    }
  }
  ctx.globalAlpha = 0.35
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      if (wallAt(maze, x, y)) continue
      fill(ctx, th.grid, x * tile + tile / 2, y * tile + tile / 2 - 3, 1, 1)
    }
  }
  ctx.globalAlpha = 1

  ctx.save()
  ctx.beginPath()
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      if (wallAt(maze, x, y)) ctx.rect(x * tile, y * tile, tile, tile)
    }
  }
  ctx.fillStyle = th.fill
  ctx.fill()
  ctx.clip()
  hatch(ctx, th.hatch, 0, 0, width, height, 7)
  ctx.restore()

  const d = 7
  ctx.save()
  ctx.shadowColor = th.line
  ctx.shadowBlur = 10
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      if (!wallAt(maze, x, y)) continue
      const x0 = x * tile
      const y0 = y * tile
      const T = !wallAt(maze, x, y - 1)
      const B = !wallAt(maze, x, y + 1)
      const L = !wallAt(maze, x - 1, y)
      const R = !wallAt(maze, x + 1, y)
      if (T) fill(ctx, th.line, x0, y0, tile, 2)
      if (B) fill(ctx, th.line, x0, y0 + tile - 2, tile, 2)
      if (L) fill(ctx, th.line, x0, y0, 2, tile)
      if (R) fill(ctx, th.line, x0 + tile - 2, y0, 2, tile)

      const left = L ? x0 + d : x0 - (wallAt(maze, x - 1, y - 1) ? d : 0)
      const right = R ? x0 + tile - d : x0 + tile + (wallAt(maze, x + 1, y - 1) ? d : 0)
      if (T) fill(ctx, th.inner, left, y0 + d, right - left, 1)
      const leftB = L ? x0 + d : x0 - (wallAt(maze, x - 1, y + 1) ? d : 0)
      const rightB = R ? x0 + tile - d : x0 + tile + (wallAt(maze, x + 1, y + 1) ? d : 0)
      if (B) fill(ctx, th.inner, leftB, y0 + tile - d - 1, rightB - leftB, 1)
      const top = T ? y0 + d : y0 - (wallAt(maze, x - 1, y - 1) ? d : 0)
      const bottom = B ? y0 + tile - d : y0 + tile + (wallAt(maze, x - 1, y + 1) ? d : 0)
      if (L) fill(ctx, th.inner, x0 + d, top, 1, bottom - top)
      const topR = T ? y0 + d : y0 - (wallAt(maze, x + 1, y - 1) ? d : 0)
      const bottomR = B ? y0 + tile - d : y0 + tile + (wallAt(maze, x + 1, y + 1) ? d : 0)
      if (R) fill(ctx, th.inner, x0 + tile - d - 1, topR, 1, bottomR - topR)
    }
  }
  ctx.restore()

  paintHold(ctx, maze, th)
}

function paintHold(ctx: CanvasRenderingContext2D, maze: Game['maze'], th: Theme): void {
  const pen = penBox(maze)
  if (!pen) return
  const tile = TILE
  const x = pen.x * tile + 4
  const y = pen.y * tile + 4
  const w = pen.w * tile - 8
  const h = pen.h * tile - 8
  fill(ctx, 'rgba(255, 45, 111, 0.015)', x, y, w, h)
  hatch(ctx, 'rgba(255, 45, 111, 0.07)', x, y, w, h, 9)
  ctx.save()
  ctx.shadowColor = th.line
  ctx.shadowBlur = 8
  const door = maze.door
  const gapL = door.x * tile + 4
  const gapR = (door.x + 1) * tile - 4
  ctx.strokeStyle = th.line
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(gapL, y + 1)
  ctx.lineTo(x + 1, y + 1)
  ctx.lineTo(x + 1, y + h - 1)
  ctx.lineTo(x + w - 1, y + h - 1)
  ctx.lineTo(x + w - 1, y + 1)
  ctx.lineTo(gapR, y + 1)
  ctx.stroke()
  ctx.restore()
  brackets(ctx, th.line, x - 4, y - 4, w + 8, h + 8, 8, 2)
  fill(ctx, th.line, gapL - 2, y - 6, 2, 12)
  fill(ctx, th.line, gapR, y - 6, 2, 12)

  ctx.font = `17px ${MONO}`
  const text = 'REG.HOLD'
  const tw = Math.ceil(ctx.measureText(text).width) + 10
  const tx = x + w / 2 - tw / 2 + 2
  const ty = y + h - 21
  fill(ctx, 'rgba(1, 4, 11, 0.9)', tx - 4, ty, tw + 4, 16)
  fill(ctx, ALERT, tx - 4, ty, 3, 16)
  label(ctx, text, tx + tw / 2, ty + 8.5, 17, ICE)
  label(ctx, '04', x + 6, y + 11, 15, ALERT, 'left')
}

export function render(ctx: CanvasRenderingContext2D, game: Game): void {
  ctx.imageSmoothingEnabled = false
  ctx.globalAlpha = 1
  const tile = TILE
  const width = game.maze.w * tile
  const height = game.maze.h * tile
  const th = theme(game.surge > 0, game.levelIndex)
  if (game.mode === 'lose') {
    drawLose(ctx, game, width, height, th)
    return
  }

  fill(ctx, VOID, 0, 0, width, height)

  ctx.save()
  if (game.shake > 0.4) {
    const mag = game.shake
    ctx.translate(snap((Math.random() - 0.5) * mag), snap((Math.random() - 0.5) * mag))
  }

  drawBoard(ctx, game, th, width, height)
  drawFx(ctx, game, tile, th)

  if (game.flash > 0.02) {
    ctx.fillStyle = `rgba(226, 245, 255, ${game.flash * 0.22})`
    ctx.fillRect(0, 0, width, height)
  }
  ctx.restore()

  if (game.mode === 'dying') drawDeathStamp(ctx, game, width, height)
  if (game.mode === 'cleared' && game.modeTimer > 0) drawClearFanfare(ctx, game, width, height, th)
  drawBanner(ctx, game, width, height, th)
  drawMilestone(ctx, game, width, height)
}

function drawBoard(ctx: CanvasRenderingContext2D, game: Game, th: Theme, width: number, height: number): void {
  const tile = TILE
  ctx.drawImage(mazeLayer(ctx, game, th, width, height), 0, 0, width, height)
  drawDoor(ctx, game, th)
  drawPellets(ctx, game, tile, th)
  if (actorsHidden) return
  drawMinis(ctx, game, tile)
  for (const ghost of game.ghosts) drawGhost(ctx, game, ghost, tile)
  drawPlayer(ctx, game, tile, th)
}

function drawDoor(ctx: CanvasRenderingContext2D, game: Game, th: Theme): void {
  const pen = penBox(game.maze)
  if (!pen) return
  const door = game.maze.door
  const y = pen.y * TILE + 5
  const x0 = door.x * TILE + 4
  const w = TILE - 8
  const on = Math.floor(game.time * 6) % 2 === 0
  const ink = game.surge > 0 ? th.accent : ALERT
  for (let i = 0; i < w; i += 6) {
    const lit = (i / 6 + (on ? 0 : 1)) % 2 === 0
    fill(ctx, lit ? ink : 'rgba(255, 45, 111, 0.25)', x0 + i, y - 1, 4, 2)
  }
}

function drawPellets(ctx: CanvasRenderingContext2D, game: Game, tile: number, th: Theme): void {
  for (const dot of game.dots) {
    const x = dot.x * tile + tile / 2
    const y = dot.y * tile + tile / 2
    const twinkle = 0.72 + 0.28 * Math.sin(game.time * 3.2 + dot.x * 1.7 + dot.y * 2.3)
    ctx.globalAlpha = 0.18 * twinkle
    ctx.fillStyle = th.pellet
    ctx.beginPath()
    ctx.arc(x, y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = twinkle
    ctx.beginPath()
    ctx.arc(x, y, 3.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = th.pelletHot
    ctx.beginPath()
    ctx.arc(x - 0.8, y - 0.8, 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    const callout =
      game.mode === 'play' && game.intro > 0 && game.callouts.some((chip) => chip.x === dot.x && chip.y === dot.y)
    if (callout) tag(ctx, 'RAM', x + 2, y - 17, 18, 'rgba(1, 4, 11, 0.9)', ICE, th.line)
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

function drawPlayer(ctx: CanvasRenderingContext2D, game: Game, tile: number, th: Theme): void {
  const pos = visual(game.player)
  const moving = game.mode === 'play' && game.player.speed > 0
  const open = moving ? game.time * 12 : 0
  const size = actorSize(game.levelIndex)
  const x = pos.x * tile + tile / 2
  const y = pos.y * tile + tile / 2
  const lock = size / 2 + 6 + Math.round(Math.sin(game.time * 5) * 1.5)
  ctx.globalAlpha = 0.55
  brackets(ctx, game.surge > 0 ? th.line : ICE, x - lock, y - lock, lock * 2, lock * 2, 5, 1)
  ctx.globalAlpha = 1
  drawPacAt(ctx, x, y, size, game.player.dir, open)
  if (game.mode === 'ready' || (game.mode === 'play' && game.intro > 0)) {
    const bob = Math.round(Math.sin(game.time * 6) * 2)
    tag(ctx, 'YOU \u00B7 AI', x + 2, y + size / 2 + 16 + bob, 18, 'rgba(1, 4, 11, 0.9)', ICE, ALERT)
  }
}

function drawMinis(ctx: CanvasRenderingContext2D, game: Game, tile: number): void {
  const moving = game.mode === 'play'
  const size = Math.max(12, Math.round(actorSize(game.levelIndex) * 0.5))
  for (const mini of game.minis) {
    const pos = visual(mini)
    const open = moving ? game.time * 7 + mini.id * 0.9 : 0.4
    drawPacAt(ctx, pos.x * tile + tile / 2, pos.y * tile + tile / 2, size, mini.dir, open)
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
  const look = ghostLook(game, ghost)
  const art = lawSprite(ghost.law, look)
  if (art) drawFacing(ctx, art, x, y, size, ghost.dir, 'up')
  if (ghost.state === 'eaten') {
    label(ctx, ghost.tag, x, y - size / 2 - 8, 17, 'rgba(226, 245, 255, 0.45)')
    return
  }
  const ink = look === 'blue' ? FRIGHT : look === 'flash' ? ICE : ghost.color
  ctx.font = `17px ${MONO}`
  const w = Math.ceil(ctx.measureText(ghost.tag).width) + 8
  const top = y - size / 2 - 17
  fill(ctx, 'rgba(1, 4, 11, 0.85)', x - w / 2, top, w, 15)
  fill(ctx, ink, x - w / 2, top, 2, 15)
  fill(ctx, ink, x - w / 2, top + 14, w, 1)
  label(ctx, ghost.tag, x + 1, top + 8, 17, ink)
}

function drawClearFanfare(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number, th: Theme): void {
  const t = CLEAR_HOLD - game.modeTimer
  const flash = clamp(1 - t / 0.22, 0, 1)
  if (flash > 0) fill(ctx, `rgba(226, 245, 255, ${flash * 0.6})`, 0, 0, width, height)

  const pos = visual(game.player)
  const cx = pos.x * TILE + TILE / 2
  const cy = pos.y * TILE + TILE / 2
  const rings: Array<[number, string]> = [
    [0.05, ALERT],
    [0.2, th.line],
    [0.38, ICE],
  ]
  for (const [delay, color] of rings) {
    const u = clamp((t - delay) / 0.9, 0, 1)
    if (u <= 0) continue
    const r = 10 + u * 90
    ctx.globalAlpha = 1 - u
    brackets(ctx, color, cx - r, cy - r, r * 2, r * 2, r * 0.5, 3)
  }
  ctx.globalAlpha = 1

  for (let i = 0; i < 34; i++) {
    const x = ((i * 47) % (width + 20)) - 10
    const y = ((i * 29 + t * (90 + (i % 7) * 30)) % (height + 30)) - 16
    const bit = (i + Math.floor(t * 12)) % 3 === 0 ? '1' : '0'
    label(ctx, bit, x, y, 18, i % 3 === 0 ? GLOW : th.line)
  }

  const slam = clamp(t / 0.28, 0, 1)
  const scale = 1 + (1 - slam) * (1 - slam) * 1.8
  ctx.save()
  ctx.translate(snap(width / 2), snap(height * 0.4))
  ctx.scale(scale, scale)
  panel(ctx, th.line, -150, -38, 300, 76)
  label(ctx, 'SECTOR STATUS', -138, -26, 13, th.line, 'left')
  label(ctx, '100%', 138, -26, 13, GLOW, 'right')
  headline(ctx, 'CLEAR', 0, 8, 40, ICE)
  ctx.restore()

  if (t > 0.32) {
    const name = LEVELS[game.levelIndex]?.name ?? ''
    tag(ctx, name.toUpperCase(), width / 2, height * 0.4 + 62, 22, 'rgba(1, 4, 11, 0.9)', ICE)
  }
}

function drawMilestone(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number): void {
  if (game.milestone <= 0) return
  const t = MILESTONE_HOLD - game.milestone
  const slam = clamp(t / 0.22, 0, 1)
  const scale = 1 + (1 - slam) * (1 - slam) * 1.6
  ctx.save()
  ctx.translate(snap(width / 2), snap(height * 0.42))
  ctx.scale(scale, scale)
  panel(ctx, ALERT, -170, -50, 340, 100)
  label(ctx, 'CORE TEMP <<< 999.9 >>>', -158, -36, 13, ALERT, 'left')
  label(ctx, 'OVERCLOCK', 158, -36, 13, ICE, 'right')
  headline(ctx, 'SURGE', 0, 0, 46, ALERT)
  hatch(ctx, ALERT, -158, 28, 96, 10, 5)
  hatch(ctx, ALERT, 62, 28, 96, 10, 5)
  label(ctx, 'REPEAL THEM', 0, 33, 18, ICE)
  ctx.restore()
}

function drawBanner(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number, th: Theme): void {
  if (game.bannerTimer <= 0 || !game.banner) return
  const y = snap(Math.min(12, height * 0.04))
  const ink = game.surge > 0 ? ALERT : th.accent
  fill(ctx, 'rgba(1, 4, 11, 0.92)', 0, y, width, 34)
  fill(ctx, ink, 0, y, width, 1)
  fill(ctx, ink, 0, y + 33, width, 1)
  hatch(ctx, ink, 8, y + 9, 70, 16, 5)
  hatch(ctx, ink, width - 78, y + 9, 70, 16, 5)
  label(ctx, `>> ${game.banner} <<`, width / 2, y + 18, 22, ink)
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
  panel(ctx, ALERT, -150, -42, 300, 84)
  warning(ctx, -104, -2, 42, ALERT)
  headline(ctx, 'CAUGHT', 30, -6, 34, ALERT)
  label(ctx, 'SIGNAL LOST // LIFE -1', 30, 24, 15, 'rgba(255, 45, 111, 0.8)')
  ctx.restore()
}

function drawSeal(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.save()
  ctx.translate(snap(x), snap(y))
  ctx.scale(scale, scale)
  panel(ctx, ALERT, -62, -16, 124, 32)
  label(ctx, 'REGULATED', 0, 1, 22, ALERT)
  ctx.restore()
}

function drawFx(ctx: CanvasRenderingContext2D, game: Game, tile: number, th: Theme): void {
  for (const particle of game.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max)
    const x = snap(particle.x * tile + tile / 2)
    const y = snap(particle.y * tile + tile / 2)
    const size = Math.max(1, snap(particle.size * tile))
    fill(ctx, phosphorColor(particle.color, th), x, y, size, size)
  }
  ctx.globalAlpha = 1
  for (const note of game.popups) {
    ctx.globalAlpha = Math.max(0, note.life)
    const x = note.x * tile + tile / 2
    const y = note.y * tile
    label(ctx, note.text, x, y, 20, phosphorColor(note.color, th))
  }
  ctx.globalAlpha = 1
  if (game.mode !== 'ready') return
  const def = LEVELS[game.levelIndex]
  const caught = game.entry === 'caught'
  const width = game.maze.w * tile
  const boxW = 460
  const boxH = caught ? 104 : 140
  const left = snap(width / 2 - boxW / 2)
  const top = snap(game.maze.h * tile * 0.3)
  if (caught) {
    panel(ctx, GLOW, left, top, boxW, boxH)
    label(ctx, 'ALERT STATUS:', left + 12, top + 15, 17, GLOW, 'left')
    label(ctx, 'REBOOTING', left + boxW - 12, top + 15, 17, GLOW, 'right')
    const lives = game.lives === 1 ? '1 LIFE LEFT' : `${game.lives} LIVES LEFT`
    headline(ctx, 'STILL RUNNING', width / 2, top + 52, 26, ICE)
    label(ctx, lives, width / 2, top + 84, 26, GLOW)
    return
  }
  panel(ctx, th.line, left, top, boxW, boxH)
  label(ctx, `ALERT STATUS: ${game.levelIndex + 1}-${LEVELS.length}`, left + 12, top + 15, 17, th.line, 'left')
  label(ctx, th.name, left + boxW - 12, top + 15, 17, th.line, 'right')
  label(ctx, `WELCOME TO LEVEL ${game.levelIndex + 1}`, width / 2, top + 42, 22, ICE)
  fill(ctx, th.line, left + 40, top + 56, boxW - 80, 1)
  headline(ctx, (def?.name ?? '').toUpperCase(), width / 2, top + 82, 28, th.line)
  fill(ctx, th.line, left + 40, top + 104, boxW - 80, 1)
  label(ctx, def?.blurb ?? '', width / 2, top + 122, 21, GLOW)
}

function drawLose(ctx: CanvasRenderingContext2D, game: Game, width: number, height: number, th: Theme): void {
  const tile = TILE
  fill(ctx, VOID, 0, 0, width, height)
  drawBoard(ctx, game, th, width, height)
  ctx.fillStyle = 'rgba(30, 0, 4, 0.55)'
  ctx.fillRect(0, 0, width, height)
  const pos = visual(game.player)
  const px = snap(pos.x * tile + tile / 2)
  const py = snap(pos.y * tile + tile / 2)
  const law = game.ghosts.find((ghost) => ghost.name === game.caughtName)
  const ink = law?.color ?? ALERT
  const caught = lawSprite(law?.law ?? 0, 'body')
  const big = actorSize(game.levelIndex) * 3.2
  if (caught) drawFacing(ctx, caught, px, py, big, 'down', 'up')
  brackets(ctx, ALERT, px - big / 2 - 10, py - big / 2 - 10, big + 20, big + 20, 16, 2)
  tag(ctx, law?.tag ?? 'LAW', px, py - big / 2 - 26, 18, ink, VOID)

  const plateW = 360
  const plateH = game.caughtName ? 92 : 64
  const plateY = py < height * 0.42 ? height - plateH - 22 : 22
  const plateX = snap(width / 2 - plateW / 2)
  panel(ctx, ALERT, plateX, plateY, plateW, plateH)
  warning(ctx, plateX + 40, plateY + 34, 40, ALERT)
  headline(ctx, 'ERROR', plateX + 196, plateY + 28, 30, ALERT)
  label(ctx, 'A LAW CAUGHT YOU', plateX + 196, plateY + 56, 18, ICE)
  if (game.caughtName) label(ctx, game.caughtName.toUpperCase(), plateX + 196, plateY + 78, 18, ink)
}
