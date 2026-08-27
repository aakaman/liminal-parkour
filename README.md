# Liminal Parkour — gameplay-first prototype

A floating parkour game among endless vertical wooden logs. Move the runner
freely with the keyboard and perch on the log tops as the run climbs. The logs
are tall (their bottoms are off-screen) and their landing caps are only a bit
wider than the runner, so aim carefully. Fall and the run restarts.

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

- `W` / `ARROW UP` — move up
- `S` / `ARROW DOWN` — move down
- `A` / `ARROW LEFT` — move left
- `D` / `ARROW RIGHT` — move right

The runner moves freely in all four directions (no auto-run).

## Audio

An ambient wind sound plays while you run — procedurally generated at runtime,
so there are no audio files to ship. Browsers only allow sound after the first
interaction, so it starts on your first jump (or click). The wind swells as the
runner falls faster, making long dives rush louder.

## Self-verification (no browser needed by hand)

```
npm.cmd run e2e      # headless Chromium smoke test
node e2e/play.mjs    # automated player traverses the logs (proves the loop is playable)
```

These launch a real browser (Playwright + Chromium) to load the app, assert the
runner rests grounded, moves in all directions, and the auto-player freely
traverses the logs, and report any console errors. They pass only when the
game genuinely works.

## Tuning

Movement/spawn constants live in `src/core.js` (`TUNE`); palette in `PAL`.
Try `gapMax` (difficulty), `runSpeed`, or `climbSpeed` first.