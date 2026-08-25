import { chromium } from 'playwright';
import { preview } from 'vite';
import fs from 'node:fs';
const server = await preview({ build: { outDir: 'dist' }, preview: { port: 5196, strictPort: true } });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.goto('http://localhost:5196/?canvas=1', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const stats = await page.evaluate(() => {
  const cv = document.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const sx = window.__px - window.__scrollX;
  const sy = window.__py - window.__scrollY;
  let dark = 0, total = 0;
  const img = ctx.getImageData(Math.max(0, Math.floor(sx) - 40), Math.max(0, Math.floor(sy) - 40), 80, 80);
  for (let i = 0; i < img.data.length; i += 4) {
    const r = img.data[i], g = img.data[i + 1], b = img.data[i + 2];
    total++;
    if (r < 120 && g < 110 && b < 100) dark++;
  }
  return { sx, sy, dark, total, scrollX: window.__scrollX, scrollY: window.__scrollY };
});
console.log('runner screen region:', JSON.stringify(stats));
const shot = 'dist/e2e-visual-' + Date.now() + '.png';
await page.screenshot({ path: shot });
console.log('shot', shot, 'size', fs.statSync(shot).size);
await browser.close(); await server.close();