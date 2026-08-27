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

// Free-movement auto-player: hold up+right to glide over the logs.
// Move right (D) and climb (W). First confirm the runner actually starts
// moving before counting, retrying the press if the frame didn't take it.
async function press(key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}
await page.keyboard.down('d');
await page.keyboard.down('w');
const start = await read();
// Ensure input registered; if x did not advance after a moment, re-press.
for (let tries = 0; tries < 6; tries++) {
  const s = await read();
  if (s.x > start.x + 3 || s.x < start.x) break;   // moved or climbed -> alive
  await press('d', 40);
  await press('w', 40);
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
