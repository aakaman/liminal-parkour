import { chromium } from 'playwright';
import { preview } from 'vite';

const PORT = 5199;
let failures = 0;
const ok = (name, cond, detail) => {
  const mark = cond ? 'PASS' : 'FAIL';
  if (!cond) failures++;
  console.log(`  [${mark}] ${name}${detail ? ' — ' + detail : ''}`);
};
const read = (page) => page.evaluate(() => ({
  x: Math.round(window.__px), y: Math.round(window.__py), grounded: window.__grounded,
}));
const settle = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await preview({ build: { outDir: 'dist' }, preview: { port: PORT, strictPort: true } });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`http://localhost:${PORT}/?canvas=1`, { waitUntil: 'networkidle' });

// Free-movement game: after boot the runner rests grounded on the starting base.
await page.waitForFunction(() => window.__px != null && window.__grounded === true, null, { timeout: 4000 });
await settle(200);
const r0 = await read(page);          // idle rest point
await settle(400);
const rIdle = await read(page);

ok('no js errors', errors.length === 0, errors.join(' | ').slice(0, 300));
ok('runner rests grounded on the base when idle', rIdle.grounded === true, `grounded=${rIdle.grounded}`);
ok('runner does not drift/sink while idle', Math.abs(rIdle.y - r0.y) < 5 && Math.abs(rIdle.x - r0.x) < 5,
   `(${r0.x},${r0.y}) -> (${rIdle.x},${rIdle.y})`);

// Move right with D, then left with A.
await page.keyboard.down('d');
await page.waitForTimeout(400);
const rRight = await read(page);
await page.keyboard.up('d');
ok('moves right on D', rRight.x > rIdle.x, `x ${rIdle.x} -> ${rRight.x}`);

await page.keyboard.down('a');
await page.waitForTimeout(400);
const rLeft = await read(page);
await page.keyboard.up('a');
ok('moves left on A', rLeft.x < rRight.x, `x ${rRight.x} -> ${rLeft.x}`);

// Climb upward with W (smaller y = higher).
await page.keyboard.down('w');
await page.waitForTimeout(350);
const rUp = await read(page);
await page.keyboard.up('w');
ok('rises on W', rUp.y < rIdle.y, `y ${rIdle.y} -> ${rUp.y}`);

// A later key press still unlocks audio, so the wind should be live.
const wind = await page.evaluate(() => window.__wind ?? {});
ok('wind ambience active after input', wind.on === true, JSON.stringify(wind));

await page.screenshot({ path: 'dist/e2e-' + Date.now() + '.png' });
console.log('  idle', JSON.stringify(rIdle), 'right', JSON.stringify(rRight),
            'left', JSON.stringify(rLeft), 'up', JSON.stringify(rUp));

await browser.close();
await server.close();
process.exit(failures === 0 ? 0 : 1);
