import { chromium } from 'playwright';
import { preview } from 'vite';
const server = await preview({ build: { outDir: 'dist' }, preview: { port: 5198, strictPort: true } });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5198/?canvas=1', { waitUntil: 'networkidle' });
const read = () => page.evaluate(() => ({
  x: Math.round(window.__px), y: Math.round(window.__py),
  g: window.__grounded, vy: Math.round(window.__pyVel), n: window.__planks, pb: window.__plankBody, rb: window.__runnerBody, gl: window.__groupLen,
}));
for (let i = 0; i < 12; i++) { console.log('t=+' + (i*150) + 'ms', JSON.stringify(await read())); await page.waitForTimeout(150); }
console.log('errors:', errors.length, errors.slice(0,3));
await browser.close(); await server.close();