// Renders carousel/index.html slide by slide into carousel/out/.
// Needs the dev server (npm run dev) and Playwright: node tools/carousel.cjs [s01,s02]
const { chromium } = require('playwright')
const only = process.argv[2]
;(async () => {
  const b = await chromium.launch()
  const p = await (await b.newContext({ viewport: { width: 1200, height: 1500 } })).newPage()
  p.on('pageerror', e => console.log('ERR', e.message))
  p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()) })
  await p.goto('http://127.0.0.1:43123/RAM-PAC/carousel/index.html')
  await p.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 60000 })
  await p.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 60000 })
  await p.waitForTimeout(500)
  const ids = await p.$$eval('.slide', (s) => s.map((e) => e.id))
  for (const id of ids) {
    if (only && !only.split(',').includes(id)) continue
    await p.locator('#' + id).screenshot({ path: require('path').join(__dirname, '..', 'carousel', 'out', id + '.png') })
  }
  console.log('rendered', ids.length)
  await b.close()
})()
