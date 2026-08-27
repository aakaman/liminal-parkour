# Liminal Parkour — gameplay-first prototype

A forward-only parkour game up endless vertical wooden logs. The runner moves
forward automatically; the only input is jump. Logs climb higher and give way
to you frequently, so time your jumps to hop from one log top to the next as
the run ascends. Fall and the run restarts.

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

## Audio

An ambient wind sound plays while you run — procedurally generated at runtime,
so there are no audio files to ship. Browsers only allow sound after the first
interaction, so it starts on your first jump (or click). The wind swells as the
runner falls faster, making long dives rush louder.

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