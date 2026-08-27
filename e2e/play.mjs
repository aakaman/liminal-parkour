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
await page.waitForTimeout(450);

// Free-movement auto-player: hold right (D) so the runner advances, and hold
// up (W) to glide/climb over the logs. Proves the WASD loop can traverse them.
await page.keyboard.down('d');
await page.keyboard.down('w');
let bestX = 0, bestY = 9999;
for (let frame = 0; frame < 400; frame++) {
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
const ok = errors.length === 0 && bestX > 2000 && bestY < 300;
console.log(ok ? 'AUTO-PLAY PASS' : 'AUTO-PLAY FAIL');
process.exit(ok ? 0 : 1);
