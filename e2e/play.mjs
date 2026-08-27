import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ build: { outDir: 'dist' }, preview: { port: 5197, strictPort: true } });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5197/?canvas=1', { waitUntil: 'networkidle' });

const read = () => page.evaluate(() => ({
  x: Math.round(window.__px), y: Math.round(window.__py), g: window.__grounded,
  cap: window.__nextCap ? [Math.round(window.__nextCap[0]), Math.round(window.__nextCap[1])] : null,
}));

await page.waitForFunction(() => window.__px != null && window.__grounded === true, null, { timeout: 5000 });
await page.waitForTimeout(200);
await page.evaluate(() => { const cv = document.querySelector('canvas'); if (cv) cv.focus(); });
async function press(key, ms) { await page.keyboard.down(key); await page.waitForTimeout(ms); await page.keyboard.up(key); }

const spawnX = (await read()).x;
await page.keyboard.down('d');
let started = false;
for (let tries = 0; tries < 10 && !started; tries++) {
  const s = await read();
  if (s.x - spawnX > 30) started = true;
  if (!started) { await page.keyboard.up('d'); await page.keyboard.down('d'); }
  await page.waitForTimeout(120);
}

let bestX = 0, bestY = 9999, jumps = 0;
for (let frame = 0; frame < 500; frame++) {
  const s = await read();
  if (s.x > bestX) bestX = s.x;
  if (s.y < bestY) bestY = s.y;
  if (s.g === true) {
    // Hop so the jump carries this cap's width + gap to the next cap.
    const lead = s.cap ? s.cap[0] - s.x : -1;
    if (lead > 14 && lead < 76) {
      await press('Space', 50);
      jumps++;
      await page.waitForTimeout(70);
      frame += 5;
    }
  }
  await page.waitForTimeout(14);
}
await page.keyboard.up('d');

console.log('PLAY maxX=' + bestX + ' minY=' + bestY + ' jumps=' + jumps + ' errors=' + errors.length);
await page.screenshot({ path: 'dist/e2e-play-' + Date.now() + '.png' });
await browser.close(); await server.close();
const ok = errors.length === 0 && bestX > 1500 && bestY < 300;
console.log(ok ? 'AUTO-PLAY PASS' : 'AUTO-PLAY FAIL');
process.exit(ok ? 0 : 1);
