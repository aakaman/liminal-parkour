import Phaser from 'phaser';
import { TUNE, PAL } from './core.js';

// Gameplay-first: the runner auto-runs forward; the only input is jump
// (Space/W/Up, with a double jump in air). Tiny two-tone planks separated by
// gaps form the endless path. Falling below the world ends the run.
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  create() {
    this.physics.world.setBounds(0, 0, 400000, TUNE.height + 200);
    this.makeBackground();
    this.cameras.main.setBackgroundColor(PAL.skyBottom);

    this.makePlanks();
    this.makePlayer();

    // Critical: register the collider so the runner lands on the planks.
    this.physics.add.collider(this.player, this.planks);

    this.cameras.main.startFollow(this.player, false, 0.1, 0.1);
    this.cameras.main.setDeadzone(140, 80);

    this.keys = this.input.keyboard.addKeys('SPACE,W,UP');

    this.distance = 0;
    this.hud = this.add.text(16, 12, '0 m', {
      fontFamily: 'monospace', fontSize: '24px', color: '#2a2724',
    }).setDepth(20);
    this.add.text(TUNE.width / 2, 22, 'SPACE = jump   ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â¦ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Â ÃƒÂ¢Ã¢â€šÂ¬Ã¢â€žÂ¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Â¦Ãƒâ€šÃ‚Â¡ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã‚Â¡ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â·   press twice in air = double-jump', {
      fontFamily: 'monospace', fontSize: '15px', color: '#4a443c',
    }).setOrigin(0.5, 0).setDepth(20);

    this._pressHeld = false;
    this._air = 0;
  }

  makePlanks() {
    this.planks = this.physics.add.staticGroup();
    // Long safe runway so the first gap is not immediate.
    this.addPlank(-240, TUNE.groundY, 880);
    let x = 640;
    let y = TUNE.groundY;
    for (let i = 0; i < 60; i++) {
      const len = rand(TUNE.plankMinLen, TUNE.plankMaxLen);
      const gap = rand(TUNE.gapMin, TUNE.gapMax);
      if (i % 4 === 2) y += rand(-40, 40);
      this.addPlank(x, y, len);
      x += len + gap;
    }
  }

  makeBackground() {
    const g = this.add.graphics();
    const h = TUNE.height;
    g.fillGradientStyle(PAL.skyTop, PAL.skyTop, PAL.skyBottom, PAL.skyBottom, 1);
    g.fillRect(0, 0, TUNE.width, h);
    g.generateTexture('sky', TUNE.width, h);
    g.destroy();
    this.add.image(TUNE.width / 2, h / 2, 'sky').setScrollFactor(0).setDepth(-50);
  }

  addPlank(x, y, len) {
    const g = this.add.graphics();
    const pTop = PAL.plankTop;
    const pStripe = PAL.plankTop2;
    const pFront = PAL.plankFront;
    const pEdge = PAL.plankEdge;
    // Top face (light wood) with a plank stripe and a drawn front/side face,
    // plus a soft shadow cast by the overhang onto the world below.
    g.fillStyle(pTop, 1);
    g.fillRect(0, 0, len, TUNE.plankHeight);
    g.fillStyle(pStripe, 1);
    g.fillRect(0, 5, len, 4);
    g.fillStyle(pFront, 1);
    g.fillRect(0, TUNE.plankHeight - 10, len, 10);
    g.fillStyle(pEdge, 1);
    g.fillRect(0, TUNE.plankHeight - 3, len, 3);
    // side grain ticks
    g.lineStyle(1, pEdge, 0.35);
    for (let i = 0; i < len; i += 18) {
      g.beginPath(); g.moveTo(i, TUNE.plankHeight - 8); g.lineTo(i + 8, TUNE.plankHeight - 4); g.strokePath();
    }
    g.generateTexture('plank' + len, len, TUNE.plankHeight);
    g.destroy();

    const plank = this.planks.create(x + len / 2, y, 'plank' + len);
    const body = plank.body;
    body.allowGravity = false;
    body.checkCollision.up = true;   // one-way top only
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    return plank;
  }

  makePlayer() {
    const g = this.add.graphics();
    // A small, readable runner: dark figure + accent cap.
    g.fillStyle(PAL.player, 1);
    g.fillRoundedRect(3, 12, 16, 19, 3);       // torso
    g.fillRect(5, 29, 5, 5);                    // leg
    g.fillRect(12, 29, 5, 5);                   // leg
    g.fillRect(7, 31, 8, 4);                    // feet
    g.fillStyle(PAL.playerAccent, 1);
    g.fillRect(3, 4, 16, 6);                    // cap
    g.fillStyle(PAL.player, 1);
    g.fillRect(3, 9, 16, 4);                    // head band
    g.generateTexture('runner', 22, 36);
    g.destroy();
    // Spawn feet ON TOP of the plank surface (plank top = groundY - plankHeight/2).
    const spawnY = TUNE.groundY - TUNE.plankHeight / 2 - 18 - 2;
    this.player = this.physics.add.sprite(TUNE.spawnX, spawnY, 'runner');
    this.player.setDepth(10);
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const p = this.player;

    p.setVelocityX(TUNE.runSpeed);

    const held = this.keys.SPACE.isDown || this.keys.W.isDown || this.keys.UP.isDown;
    const ground = p.body.blocked.down || p.body.touching.down;
    if (held && !this._pressHeld) {
      if (ground) {
        p.setVelocityY(-TUNE.jumpVelocity);
        this._air = 0;
      } else if (this._air === 0) {
        p.setVelocityY(-TUNE.doubleJumpVelocity);
        this._air = 1;
      }
    }
    this._pressHeld = held;
    if (ground) this._air = 0;

    const m = Math.floor(p.x / 40);
    if (m !== this.distance) { this.distance = m; this.hud.setText(m + ' m'); }

    // Debug state for headless e2e.
    if (typeof window !== 'undefined') {
      window.__px = p.x; window.__py = p.y;
      window.__scrollX = this.cameras.main.scrollX;
      window.__scrollY = this.cameras.main.scrollY;
      window.__grounded = ground;
      window.__planks = this.planks ? this.planks.getLength() : -1;
      window.__pyVel = p.body.velocity.y;
      const first = this.planks.children ? this.planks.children.entries[0] : null;
      const pb = first ? { hasOwn: Object.prototype.hasOwnProperty.call(first, 'body'), x: first.body && first.body.x, y: first.body && first.body.y, w: first.body && first.body.width, h: first.body && first.body.height, immovable: first.body && first.body.immovable, cls: first.constructor && first.constructor.name } : null;
      window.__plankBody = pb;
      window.__groupLen = this.planks.children ? this.planks.children.length : -1;
      // Expose each plank's horizontal span [x0, x1] for auto-play tests.
      const spans = [];
      if (this.planks.children) {
        for (const pl of this.planks.children.entries) {
          if (pl && pl.body) spans.push([pl.x - pl.displayWidth / 2, pl.x + pl.displayWidth / 2]);
        }
      }
      window.__plankSpans = spans;
      // Next gap ahead of the runner: [gapStart, gapEnd]. -1 if none.
      let ng = null;
      if (spans.length >= 2) {
        for (let i = 0; i < spans.length - 1; i++) {
          const a1 = spans[i][1], b0 = spans[i + 1][0];
          if (b0 - a1 > 40) {                      // a real gap
            if (b0 > p.x) { ng = [a1, b0]; break; } // first gap ahead
          }
        }
      }
      window.__nextGap = ng;
      window.__runnerBody = { x: p.body.x, y: p.body.y, w: p.body.width, h: p.body.height };
    }

    // Fail when the runner drops below the world.
    if (p.y > TUNE.height + 140) {
      this.scene.restart();
    }
  }
}

function rand(lo, hi) { return lo + Math.random() * (hi - lo); }