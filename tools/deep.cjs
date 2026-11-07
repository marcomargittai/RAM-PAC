// Renders the field-notes carousel (carousel/deep) to PNGs and one PDF for
// LinkedIn. Needs `npm run dev`. Stills come from tools/deepshots.cjs.
const { chromium } = require('playwright')
const { execFileSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const OUT = path.join(__dirname, '../carousel/deep/out/')
;(async () => {
  fs.mkdirSync(OUT, { recursive: true })
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 1 })
  await p.goto('http://127.0.0.1:43123/carousel/deep/index.html')
  await p.waitForSelector('body[data-ready="1"]', { timeout: 30000 })
  await p.waitForTimeout(500)
  const files = []
  for (const s of await p.$$('.s')) {
    const f = `${OUT}${await s.getAttribute('data-n')}.png`
    await s.screenshot({ path: f })
    files.push(f)
  }
  await b.close()
  const pdf = 'import sys\nfrom PIL import Image\nims=[Image.open(f).convert("RGB") for f in sys.argv[2:]]\nims[0].save(sys.argv[1], save_all=True, append_images=ims[1:], resolution=72, quality=92)\n'
  execFileSync('python3', ['-c', pdf, OUT + 'pac-ram-field-notes.pdf', ...files])
  console.log(files.length, 'slides')
})()
