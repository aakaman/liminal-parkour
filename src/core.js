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
  runSpeed: 150,          // max horizontal speed: a ~1.5x-height jump lands on the next cap
  climbSpeed: 200,        // downward push speed (hold S / Down)
  jumpVelocity: 400,      // single-jump impulse ~1.5x player height (v=sqrt(2*g*1.5*36))
  doubleJumpVelocity: 340,// double-jump impulse (press jump again mid-air)
  maxFallSpeed: 1000,
  worldDeep: 720,         // extra play-area depth below the view for falling deep
  deathFlash: 300,        // ms of full-screen color inversion after a fatal fall
  resetMargin: 120,       // reset this far before the hard bottom when you fall
  logWidth: 32,         // cap a bit wider than the player (player sprite is 22px)
  logStartW: 720,
  logHMin: 460,         // very long logs -> you can't see the bottom of them
  logHMax: 620,
  startTop: 415,
  logTopHigh: 330,      // highest a cap climbs to (keeps the skyline in view)
  logTopMax: 430,       // lowest a cap settles at
  climbStep: 24,        // gentle UP step (reliable to hop)
  descendStep: 14,      // gentle DOWN step (landable; rolling relief)
  gapMin: 40,           // always reachable in one hop (spacing <= jump reach)
  gapMax: 55,
  spawnX: 120,
  groundY: 430,
};
