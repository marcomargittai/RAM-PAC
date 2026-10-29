// Fills the carousel's sprite slots with the game's own sprites, so the law
// tints and states are exactly what the game draws.

import { loadSprites, lawSprite, type GhostLook } from '../src/sprites'

async function main(): Promise<void> {
  await loadSprites()
  for (const slot of document.querySelectorAll<HTMLCanvasElement>('canvas[data-law]')) {
    const art = lawSprite(Number(slot.dataset.law), (slot.dataset.look ?? 'body') as GhostLook)
    if (!art) continue
    slot.width = 32
    slot.height = 32
    const ctx = slot.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(art, 0, 0)
  }
  await document.fonts.ready
  document.body.dataset.ready = '1'
}

void main()
