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
        this.add.text(TUNE.width / 2, 22, 'SPACE to jump - press twice in air for a double-jump', {
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
    const H = TUNE.plankHeight;
    const P = PAL;
    // --- Draw a horizontal wooden LOG ---
    // Backdrop: bark body.
    g.fillStyle(P.plankWhole, 1);
    g.fillRoundedRect(0, 3, len, H - 4, 4);
    g.fillStyle(P.plankWholeDark, 1);
    g.fillRect(0, 3, len, (H - 4) / 2);          // subtle top-to-bottom shade
    // Grain arcs across the bark (log-ring feel), lighter strokes.
    g.lineStyle(1, P.plankRing, 0.5);
    for (let i = 4; i < len; i += 12) {
      g.beginPath();
      g.arc(i, 3 + (H - 4) / 2, (H - 4) / 2 + 2, Math.PI, 0, false);
      g.strokePath();
    }
    // Bark side ticks near the bottom (rough bark).
    g.lineStyle(1, P.plankEdge, 0.4);
    for (let i = 6; i < len; i += 10) {
      g.beginPath(); g.moveTo(i, H - 7); g.lineTo(i + 5, H - 3); g.strokePath();
    }
    // Rounded ends (log cross-section hint) already given by fillRoundedRect.
    // Bright TOP landing face ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â the runner actually stands on this.
    g.fillStyle(P.plankTop, 1);
    g.fillRoundedRect(0, 0, len, 8, { tl: 4, tr: 4, bl: 0, br: 0 });
    g.fillStyle(P.plankTopHi, 0.9);
    g.fillRect(0, 2, len, 2);                     // highlight line on the top
    // Soft shadow cast by the log onto whatever is below.
    g.fillStyle('#2e2418', 0.18);
    g.fillRect(0, H - 3, len, 3);

    g.generateTexture('plank' + len, len, H);
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
    // Idle/run frame ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â tall, legs apart (mid stride).
    const r = this.add.graphics();
    r.fillStyle(PAL.playerAccent, 1);
    r.fillRect(3, 2, 16, 6);                     // cap
    r.fillStyle(PAL.player, 1);
    r.fillRect(3, 7, 16, 4);                     // head
    r.fillRoundedRect(3, 12, 16, 18, 3);         // torso
    r.fillRect(5, 29, 5, 6);                     // rear leg
    r.fillRect(12, 28, 5, 7);                    // front leg
    r.fillRect(6, 33, 5, 3);                     // rear foot
    r.fillRect(12, 33, 6, 3);                    // front foot
    r.fillStyle('#6a6053', 1);
    r.fillRect(1, 34, 20, 2);                    // arm swung at side
    r.generateTexture('runner-run', 22, 36);
    r.destroy();

    // Jump frame ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â legs tucked under the body, slightly leaned back.
    const j = this.add.graphics();
    j.fillStyle(PAL.playerAccent, 1);
    j.fillRect(3, 2, 16, 6);                     // cap
    j.fillStyle(PAL.player, 1);
    j.fillRect(3, 7, 16, 4);                     // head
    j.fillRoundedRect(3, 12, 16, 18, 3);         // torso
    j.fillRect(5, 27, 6, 5);                     // tucked thigh
    j.fillRect(12, 27, 6, 5);                    // tucked thigh
    j.fillRect(5, 31, 6, 3);                     // tucked shin
    j.fillRect(12, 31, 6, 3);                    // tucked shin
    j.fillStyle('#6a6053', 1);
    j.fillRect(1, 20, 6, 12);                    // arm up / forward
    j.fillStyle(PAL.player, 1);
    j.fillRect(15, 20, 5, 5);                    // other arm back
    j.generateTexture('runner-jump', 22, 36);
    j.destroy();

    // Spawn feet ON TOP of the plank surface (plank top = groundY - plankHeight/2).
    const spawnY = TUNE.groundY - TUNE.plankHeight / 2 - 18 - 2;
    this.player = this.physics.add.sprite(TUNE.spawnX, spawnY, 'runner-run');
    this.player.setDepth(10);
    this.player.setScale(1);
    this._jumpPop = 0;    // small settle timer used by the jump "twitch"
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
        this.startJumpAnim();
      } else if (this._air === 0) {
        p.setVelocityY(-TUNE.doubleJumpVelocity);
        this._air = 1;
        this.startJumpAnim();
      }
    }
    this._pressHeld = held;
    if (ground) {
      this._air = 0;
      this.endJumpAnim();
    }

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

    // Short-jump squash/stretch pop.
    this.updateJumpPop(dt);
  }

  startJumpAnim() {
    this.player.setTexture('runner-jump');
    this._jumpPop = 1.0;
  }

  endJumpAnim() {
    this.player.setTexture('runner-run');
    this._jumpPop = 0;
    this.player.setScale(1, 1);
  }

  updateJumpPop(dt) {
    if (this._jumpPop && this._jumpPop !== 0) {
      const amount = Math.sin(this._jumpPop * Math.PI) * 0.12;
      this.player.setScale(1 + amount, 1 - amount * 0.6);
      this._jumpPop -= dt * 6;
      if (this._jumpPop <= 0) { this._jumpPop = 0; this.player.setScale(1, 1); }
    }
  }
}

function rand(lo, hi) { return lo + Math.random() * (hi - lo); }