// Gameplay-core tuning + palette. Visuals are simple but intentional and stay
// in a light grayish-brown family.
export const PAL = {
  skyTop: '#b7ae9f',
  skyBottom: '#dcd5c9',
  plankTop: '#d9b483',      // log top face (bright wooden landing surface)
  plankTopHi: '#f0d09a',     // highlight along the top edge
  plankWhole: '#a9713f',     // log body (bark / wood)
  plankWholeDark: '#8a5a30',   // darker bark tone
  plankFront: '#6f4526',     // bark underside / end
  plankEdge: '#4c3119',      // deep bark shadow
  plankRing: '#7c5430',      // grain ring line
  player: '#3a3530',
  playerAccent: '#2f6d8f',   // cap
  hud: '#332f2a',
};

export const TUNE = {
  width: 960,
  height: 540,
  gravity: 1500,
  runSpeed: 320,
  jumpVelocity: 640,
  doubleJumpVelocity: 560,
  maxFallSpeed: 1000,
  logWidth: 260,        // long cap = generous landing target (kept vertical by tall body)
  logStartW: 720,
  logHMin: 140,
  logHMax: 240,
  startTop: 417,
  logTopHigh: 180,      // highest a cap climbs to (leaves headroom above)
  logTopMax: 440,       // lowest a cap settles at
  climbStep: 50,        // max UP step between caps (<= single-jump rise)
  descendStep: 14,      // max DOWN step (small so a run-off always lands)
  gapMin: 12,
  gapMax: 28,
  spawnX: 120,
  groundY: 430,
};
