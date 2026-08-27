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
  x: Math.round(window.__px), y: Math.round(window.__py),
}));

// Let the game boot and the runner settle grounded (keys attach reliably here).
await page.waitForFunction(() => window.__px != null && window.__grounded === true, null, { timeout: 5000 });
await page.waitForTimeout(200);

// Give the canvas keyboard focus so the first keypress reliably registers
// (a common flake in headless Chromium).
await page.evaluate(() => { const cv = document.querySelector('canvas'); if (cv) cv.focus(); });

// Free-movement auto-player: hold up+right to glide over the logs.
// Move right (D) and climb (W). Wait until the runner is actually moving
// before counting frames, retrying the input if it didn't take.
async function press(key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}
async function holdBoth() {
  await page.keyboard.down('d');
  await page.keyboard.down('w');
}
await holdBoth();
// Poll until the runner has clearly left spawn (moved right or climbed),
// re-pressing the keys if the first dispatch was swallowed.
const spawnX = (await read()).x;
let started = false;
for (let tries = 0; tries < 10 && !started; tries++) {
  const s = await read();
  if (s.x - spawnX > 30 || s.y < 320) started = true;   // moved right or climbed
  if (!started) { await page.keyboard.up('d'); await page.keyboard.up('w'); await holdBoth(); }
  await page.waitForTimeout(120);
}

let bestX = 0, bestY = 9999;
for (let frame = 0; frame < 380; frame++) {
  const s = await read();
  if (s.x > bestX) bestX = s.x;
  if (s.y < bestY) bestY = s.y;
  await page.waitForTimeout(16);
}
await page.keyboard.up('d');
await page.keyboard.up('w');

console.log('PLAY maxX=' + bestX + ' minY=' + bestY + ' errors=' + errors.length);
await page.screenshot({ path: 'dist/e2e-play-' + Date.now() + '.png' });
await browser.close(); await server.close();
const ok = errors.length === 0 && bestX > 1500 && bestY < 300;
console.log(ok ? 'AUTO-PLAY PASS' : 'AUTO-PLAY FAIL');
process.exit(ok ? 0 : 1);
