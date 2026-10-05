import type { SceneId } from './story'

const NIGHT = '#100818'
const SKY = '#2a1848'
const DUSK = '#ff6a3d'
const GOLD = '#ffb000'
const CYAN = '#3ad7ff'
const MAGENTA = '#ff2e93'
const PAPER = '#f4f0e6'
const RED = '#e1062c'
const INK = '#07040f'

function block(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

function skyline(ctx: CanvasRenderingContext2D, lights: string): void {
  block(ctx, SKY, 0, 0, 160, 34)
  block(ctx, DUSK, 0, 28, 160, 8)
  block(ctx, NIGHT, 0, 36, 160, 48)
  const towers: Array<[number, number, number]> = [
    [6, 18, 14],
    [22, 10, 10],
    [36, 20, 16],
    [56, 8, 12],
    [72, 16, 18],
    [94, 12, 10],
    [108, 22, 20],
    [132, 14, 12],
    [146, 24, 10],
  ]
  for (const [x, top, w] of towers) {
    block(ctx, INK, x, top, w, 36 - top + 8)
    for (let wy = top + 3; wy < 34; wy += 4) {
      for (let wx = x + 2; wx < x + w - 2; wx += 4) {
        if ((wx + wy) % 8 === 0) block(ctx, lights, wx, wy, 2, 2)
      }
    }
  }
}

function drawCity(ctx: CanvasRenderingContext2D): void {
  skyline(ctx, GOLD)
  block(ctx, PAPER, 118, 8, 6, 6)
}

function drawEvening(ctx: CanvasRenderingContext2D): void {
  skyline(ctx, CYAN)
  block(ctx, PAPER, 118, 8, 6, 6)
  block(ctx, INK, 74, 18, 8, 6)
}

function drawDartmouth(ctx: CanvasRenderingContext2D): void {
  block(ctx, '#3a2468', 0, 0, 160, 40)
  block(ctx, '#1a4030', 0, 40, 160, 44)
  block(ctx, PAPER, 58, 22, 44, 28)
  block(ctx, NIGHT, 74, 34, 10, 16)
  block(ctx, GOLD, 62, 26, 8, 6)
  block(ctx, GOLD, 90, 26, 8, 6)
  block(ctx, CYAN, 18, 48, 4, 8)
  block(ctx, PAPER, 16, 44, 8, 4)
  block(ctx, CYAN, 128, 50, 4, 8)
  block(ctx, PAPER, 126, 46, 8, 4)
}

function drawLab(ctx: CanvasRenderingContext2D): void {
  block(ctx, NIGHT, 0, 0, 160, 84)
  block(ctx, '#1c1233', 18, 28, 70, 40)
  block(ctx, CYAN, 24, 34, 58, 28)
  for (let i = 0; i < 5; i++) block(ctx, i % 2 ? GOLD : MAGENTA, 28 + i * 10, 40, 6, 4)
  block(ctx, GOLD, 108, 36, 28, 8)
  block(ctx, GOLD, 112, 46, 20, 6)
  block(ctx, CYAN, 116, 54, 12, 4)
}

function drawPaper(ctx: CanvasRenderingContext2D): void {
  block(ctx, NIGHT, 0, 0, 160, 84)
  block(ctx, PAPER, 48, 16, 64, 52)
  block(ctx, INK, 56, 24, 48, 3)
  block(ctx, INK, 56, 32, 40, 2)
  block(ctx, INK, 56, 38, 44, 2)
  block(ctx, GOLD, 56, 48, 28, 8)
  block(ctx, CYAN, 18, 20, 16, 28)
}

function drawKitchen(ctx: CanvasRenderingContext2D): void {
  block(ctx, '#241838', 0, 0, 160, 50)
  block(ctx, '#3a2848', 0, 50, 160, 34)
  block(ctx, INK, 58, 28, 46, 30)
  block(ctx, CYAN, 62, 32, 38, 22)
  block(ctx, GOLD, 70, 40, 22, 3)
  block(ctx, PAPER, 40, 58, 8, 10)
}

function drawHalls(ctx: CanvasRenderingContext2D): void {
  block(ctx, NIGHT, 0, 0, 160, 84)
  block(ctx, '#1a1030', 0, 58, 160, 26)
  for (let i = 0; i < 6; i++) {
    const x = 8 + i * 26
    block(ctx, '#2a1848', x, 16, 18, 46)
    for (let y = 20; y < 58; y += 6) {
      block(ctx, i % 2 ? CYAN : GOLD, x + 3, y, 12, 2)
    }
  }
}

function drawOrder(ctx: CanvasRenderingContext2D): void {
  block(ctx, NIGHT, 0, 0, 160, 84)
  block(ctx, PAPER, 30, 18, 8, 48)
  block(ctx, PAPER, 48, 18, 8, 48)
  block(ctx, PAPER, 104, 18, 8, 48)
  block(ctx, PAPER, 122, 18, 8, 48)
  block(ctx, RED, 70, 40, 8, 16)
  block(ctx, RED, 84, 36, 8, 20)
  block(ctx, GOLD, 66, 58, 30, 4)
}

function drawShip(ctx: CanvasRenderingContext2D): void {
  block(ctx, NIGHT, 0, 0, 160, 84)
  skyline(ctx, CYAN)
  block(ctx, INK, 62, 40, 36, 24)
  block(ctx, MAGENTA, 66, 44, 28, 14)
  block(ctx, PAPER, 72, 48, 16, 3)
}

function drawVeto(ctx: CanvasRenderingContext2D): void {
  block(ctx, '#241428', 0, 0, 160, 84)
  block(ctx, '#4a2848', 20, 20, 120, 48)
  block(ctx, RED, 36, 30, 28, 32)
  block(ctx, PAPER, 72, 34, 52, 6)
  block(ctx, PAPER, 72, 46, 40, 4)
  block(ctx, GOLD, 72, 56, 18, 4)
}

function drawWeights(ctx: CanvasRenderingContext2D): void {
  block(ctx, NIGHT, 0, 0, 160, 84)
  block(ctx, '#102028', 24, 18, 112, 48)
  block(ctx, CYAN, 32, 28, 40, 6)
  block(ctx, GOLD, 32, 40, 70, 4)
  block(ctx, PAPER, 32, 50, 54, 4)
  block(ctx, MAGENTA, 108, 46, 16, 10)
}

function drawWire(ctx: CanvasRenderingContext2D): void {
  block(ctx, INK, 0, 0, 160, 84)
  block(ctx, RED, 0, 30, 160, 22)
  block(ctx, PAPER, 8, 36, 144, 4)
  block(ctx, PAPER, 8, 44, 90, 3)
  block(ctx, GOLD, 8, 8, 36, 8)
}

function drawBlackout(ctx: CanvasRenderingContext2D): void {
  block(ctx, INK, 0, 0, 160, 84)
  block(ctx, GOLD, 76, 36, 8, 8)
  block(ctx, '#3a2808', 74, 34, 12, 12)
}

export function drawComic(ctx: CanvasRenderingContext2D, scene: SceneId): void {
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.setTransform(2, 0, 0, 2, 0, 0)
  if (scene === 'city') drawCity(ctx)
  else if (scene === 'evening') drawEvening(ctx)
  else if (scene === 'dartmouth') drawDartmouth(ctx)
  else if (scene === 'lab') drawLab(ctx)
  else if (scene === 'paper') drawPaper(ctx)
  else if (scene === 'kitchen') drawKitchen(ctx)
  else if (scene === 'halls') drawHalls(ctx)
  else if (scene === 'order') drawOrder(ctx)
  else if (scene === 'ship') drawShip(ctx)
  else if (scene === 'veto') drawVeto(ctx)
  else if (scene === 'weights') drawWeights(ctx)
  else if (scene === 'wire') drawWire(ctx)
  else drawBlackout(ctx)
  ctx.restore()
}
