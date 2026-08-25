// Gameplay-core tuning + palette. Visuals are simple but intentional and stay
// in a light grayish-brown family.
export const PAL = {
  skyTop: '#b7ae9f',
  skyBottom: '#dcd5c9',
  plankTop: '#cfbda6',      // log top face (bright landing surface)
  plankTopHi: '#e0d3be',     // highlight along the top edge
  plankWhole: '#b3926f',     // log body (bark / wood)
  plankWholeDark: '#a58562',   // darker bark tone
  plankFront: '#8a6f52',     // bark underside / end
  plankEdge: '#5f4a33',      // deep bark shadow
  plankRing: '#7a6045',      // grain ring line
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
  plankHeight: 26,
  plankMinLen: 160,
  plankMaxLen: 320,
  gapMin: 70,
  gapMax: 118,
  spawnX: 120,
  groundY: 430,
};