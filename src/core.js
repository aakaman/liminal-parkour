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
  plankHeight: 26,
  plankMinLen: 160,
  plankMaxLen: 320,
  gapMin: 70,
  gapMax: 118,
  spawnX: 120,
  groundY: 430,
};
