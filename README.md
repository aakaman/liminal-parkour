# Liminal Parkour — gameplay-first prototype

An endless first-person forward parkour run down a receding avenue of log ends,
with family houses flanking both sides converging to the horizon. You
automatically run forward; jump to clear the gaps between log caps and climb
the path. Fail a jump and you fall into the void — the world inverts, a glitch
sounds, and the run restarts.

Built with Phaser 3 + Vite. The pseudo-3D depth is a perspective billboard
projection (objects shrink and recede toward a vanishing point), so there is no
3D engine — it runs in the Canvas/WebGL renderer.

## Run

```
npm.cmd run dev      # start the Vite dev server  ->  http://localhost:5173
npm.cmd run build    # production build into dist/
```

On this machine `npm` is invoked as `npm.cmd` because the PowerShell execution
policy blocks `npm.ps1`.

## Controls

- `SPACE` / `W` / `ARROW UP` — jump (press again mid-air to double-jump)
- `S` / `ARROW DOWN` — drop faster while airborne
- `A` / `ARROW LEFT` — sway left
- `D` / `ARROW RIGHT` — sway right

You auto-run forward; jump to clear gaps and climb the log caps. Steer slightly
side to side to weave along the path. Fall off and the run restarts.

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