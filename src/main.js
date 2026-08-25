import Phaser from 'phaser';
import { TUNE, PAL } from './core.js';
import { GameScene } from './GameScene.js';

// Gameplay-first single-scene boot: straight into the action, no menu.
// Optional ?canvas=1 forces the Canvas renderer (helps headless pixel checks).
const forceCanvas = new URLSearchParams(location.search).get('canvas') === '1';

const config = {
  type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'gamewrap',
  width: TUNE.width,
  height: TUNE.height,
  backgroundColor: PAL.skyBottom,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: TUNE.gravity }, debug: false },
  },
  scene: [GameScene],
};

const game = new Phaser.Game(config);
// Expose for headless e2e introspection.
window.__game = game;