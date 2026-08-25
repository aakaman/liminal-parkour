# Liminal Parkour — gameplay-first prototype

A forward-only parkour game across endless wooden planks. The runner moves
forward automatically; the only input is jump. Time your jumps to cross the
gaps between planks. Fall through a gap and the run restarts.

Built with Phaser 3 + Vite. Currently gameplay-first (simple, deliberate
grayish-brown visuals; the liminal atmosphere comes in a later pass).

## Run

```
npm.cmd run dev      # start the Vite dev server  ->  http://localhost:5173
npm.cmd run build    # production build into dist/
```

On this machine `npm` is invoked as `npm.cmd` because the PowerShell execution
policy blocks `npm.ps1`.

## Controls

- `SPACE` / `W` / `UP` — jump (press again in the air for a double jump)
- The runner auto-runs forward.

## Self-verification (no browser needed by hand)

```
npm.cmd run e2e      # headless Chromium smoke test
node e2e/play.mjs    # automated player crosses gaps (proves the loop is playable)
```

These launch a real browser (Playwright + Chromium) to load the app, assert the
runner grounds, jumps, and auto-plays across gaps, and report any console
errors. They pass only when the game genuinely works.

## Tuning

Movement/spawn constants live in `src/core.js` (`TUNE`); palette in `PAL`.
Try `gapMax` (difficulty), `runSpeed`, or `jumpVelocity` first.