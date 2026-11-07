// One game frame twice for the carousel's CRT sheet: the flat 2D canvas the
// game draws, and the same frame after the WebGL tube. Needs `npm run dev`.
const { chromium } = require('playwright')
const path = require('path')
const fs = require('fs')
const OUT = path.join(__dirname, '../carousel/deep/shots/')
const T = path.join(__dirname, 'trailer/')
;(async () => {
  const b = await chromium.launch()
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 })).newPage()
  p.on('pageerror', (e) => console.log('ERR', e.message))
  await p.route('**/rpc/**', (r) => r.abort())
  await p.addInitScript({ content: fs.readFileSync(T + 'vclock.js', 'utf8') + '\n' + fs.readFileSync(T + 'pilot.js', 'utf8') })
  await p.goto('http://127.0.0.1:43123/')
  await p.waitForTimeout(3000)
  const step = (ms) => p.evaluate((ms) => { window.__pilot(); return window.__step(ms) }, ms)
  const ev = (fn) => p.evaluate(fn)
  const skip = async (sec) => { for (let t = 0; t < sec * 1000; t += 50) await step(50) }
  const until = async (fn, max = 60) => { for (let t = 0; t < max * 1000; t += 50) { if (await ev(fn)) return; await step(50) } console.log('timeout') }
  await skip(4)
  await p.keyboard.press('Enter'); await step(200)
  for (let i = 0; i < 40 && (await ev(() => window.__dbg.stage.kind)) !== 'game'; i++) { await p.keyboard.press('Escape'); await step(100); await p.keyboard.press('Enter'); await step(100) }
  await p.keyboard.press('Enter')
  await until(() => window.__game.mode === 'play')
  await ev(() => { window.__game.lives = 9 })
  await skip(5.5)
  await ev(() => { window.__game.lives = 9 })
  // freeze: one more frame, then read both canvases without stepping again
  await step(16)
  const info = await ev(() => {
    const src = window.__src
    const out = window.__crt ? window.__crt.canvas : null
    return { src: src.toDataURL('image/png'), sw: src.width, sh: src.height, rect: out ? out.getBoundingClientRect().toJSON() : null, ow: out?.width, oh: out?.height }
  })
  fs.writeFileSync(OUT + 'crt-raw.png', Buffer.from(info.src.split(',')[1], 'base64'))
  const r = info.rect
  await p.screenshot({ path: OUT + 'crt-tube.png', clip: { x: r.x, y: r.y, width: r.width, height: r.height } })
  console.log(JSON.stringify({ sw: info.sw, sh: info.sh, rect: r, ow: info.ow, oh: info.oh }))
  await b.close()
})()
