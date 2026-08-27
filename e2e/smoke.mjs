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
  x: window.__px, y: window.__py, grounded: window.__grounded,
}));

const server = await preview({ build: { outDir: 'dist' }, preview: { port: PORT, strictPort: true } });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`http://localhost:${PORT}/?canvas=1`, { waitUntil: 'networkidle' });

// Within the safe runway the runner should be grounded and advancing. Sample
// only once the runner is moving on the base (avoids the boot frame flake).
await page.waitForFunction(() => window.__px != null && window.__px > 180 && window.__grounded === true, null, { timeout: 4000 });
const r1 = await read(page);
await page.waitForTimeout(500);
const r2 = await read(page);

ok('no js errors', errors.length === 0, errors.join(' | ').slice(0, 300));
ok('runner is grounded on the runway', r1.grounded === true, `grounded=${r1.grounded}`);
ok('runner not sinking during runway (y stable near platform)', Math.abs((r2.y ?? 0) - (r1.y ?? 0)) < 30,
   `y ${r1.y} -> ${r2.y}`);
ok('runner advances forward', (r2.x ?? 0) > (r1.x ?? 0), `x ${r1.x} -> ${r2.x}`);

// Jump test: press Space and confirm y decreases (rises).
await page.keyboard.down('Space');
await page.waitForTimeout(70);
await page.keyboard.up('Space');
await page.waitForTimeout(120);
const r3 = await read(page);
ok('jump lifts the runner', (r3.y ?? Infinity) < (r2.y ?? 0), `y ${r2.y} -> ${r3.y}`);
ok('jump state alive (x still advancing)', (r3.x ?? 0) > (r2.x ?? 0), `x ${r2.x} -> ${r3.x}`);

// The first key press is also what unlocks audio, so the wind should be live.
const wind = await page.evaluate(() => window.__wind ?? {});
ok('wind ambience active after first input', wind.on === true, JSON.stringify(wind));

await page.screenshot({ path: 'dist/e2e-' + Date.now() + '.png' });
console.log('  state: r1', JSON.stringify(r1), ' r2', JSON.stringify(r2), ' r3', JSON.stringify(r3));

await browser.close();
await server.close();
process.exit(failures === 0 ? 0 : 1);