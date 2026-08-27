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
  x: window.__px, y: window.__py, g: window.__grounded,
  cap: window.__nextCap, higher: window.__nextCapHigher,
}));

let jumps = 0, landings = 0, bestX = 0, prevG = true, anyJumped = false;

for (let frame = 0; frame < 300; frame++) {
  const s = await read();
  if (!s || typeof s.x !== 'number') { await page.waitForTimeout(16); continue; }
  if (s.x > bestX) bestX = s.x;
  if (s.g === true && prevG === false) landings++;
  prevG = s.g === true;

  if (s.cap) {
    const gapStart = s.cap[0];
    const distToGap = gapStart - s.x;
    const grounded = s.g === true;
    const inLead = distToGap > 26 && distToGap < 95;
    if (grounded && inLead === true) {
      await page.keyboard.down('Space');
      await page.waitForTimeout(30);
      await page.keyboard.up('Space');
      jumps++; anyJumped = true;
      await page.waitForTimeout(260);
      frame += 16;
    }
  }
  await page.waitForTimeout(16);
}
console.log('PLAY maxX=' + Math.round(bestX) + ' jumps=' + jumps + ' landings=' + landings + ' errors=' + errors.length);
await page.screenshot({ path: 'dist/e2e-play-' + Date.now() + '.png' });
await browser.close(); await server.close();
const ok = errors.length === 0 && anyJumped && jumps >= 3 && landings >= 1 && bestX > 1500;
console.log(ok ? 'AUTO-PLAY PASS' : 'AUTO-PLAY FAIL');
process.exit(ok ? 0 : 1);