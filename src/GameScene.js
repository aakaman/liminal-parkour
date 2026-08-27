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
    this.makeSkyline();
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

  makeSkyline() {
    // A row of tall and short 2D buildings far in the background. They
    // parallax-scroll (slower than the world) so they pass by as the runner
    // advances, sitting on the horizon just behind the run line.
    this._bldgN = 0;
    const count = 30;
    let x = -800;
    const colTones = ['#8a7668', '#9a8272', '#7d6a5d', '#94806f'];
    for (let i = 0; i < count; i++) {
      const w = randInt(120, 220);
      // Mix of short, medium and tall buildings.
      const r = Math.random();
      const h = r < 0.4 ? randInt(120, 200) : r < 0.75 ? randInt(200, 320) : randInt(330, 430);
      const tone = colTones[i % colTones.length];
      this.addBuilding(x, w, h, tone);
      x += w + randInt(60, 140);
    }
  }

  addBuilding(x, w, h, tone) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const edge = shade(tone, 0.72);
    // Façade.
    ctx.fillStyle = tone;
    ctx.fillRect(0, 0, w, h);
    // Side shade (light from the left).
    ctx.fillStyle = edge;
    ctx.fillRect(w - 14, 0, 14, h);
    // Windows - a few lit dots for a dusk skyline feel.
    const lit = ['#e8cf8a', '#cfb27a', '#b9a06a'];
    const cols = Math.floor(w / 26);
    const rows = Math.floor((h - 34) / 32);
    for (let cx = 0; cx < cols; cx++) {
      for (let ry = 0; ry < rows; ry++) {
        if (Math.random() < 0.4) {
          ctx.fillStyle = lit[Math.floor(Math.random() * lit.length)];
          ctx.fillRect(12 + cx * 26, 18 + ry * 32, 12, 16);
        }
      }
    }
    // Roof edge highlight and a small rooftop hut on taller buildings.
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, w, 6);
    if (h > 300) {
      const hutW = Math.min(40, w - 20);
      ctx.fillStyle = edge;
      ctx.fillRect((w - hutW) / 2, -14, hutW, 14);
    }
    const img = this.add.image(x + w / 2, TUNE.groundY - h / 2, this.makeBuildingTexture(c));
    img.setScrollFactor(0.55, 1);
    img.setDepth(-40);
    return img;
  }

  makeBuildingTexture(c) {
    const key = 'bldg' + (this._bldgN++);
    this.textures.addCanvas(key, c);
    return key;
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
    const c = document.createElement('canvas');
    c.width = TUNE.width; c.height = TUNE.height;
    const ctx = c.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, TUNE.height);
    grad.addColorStop(0, PAL.skyTop);
    grad.addColorStop(1, PAL.skyBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, TUNE.width, TUNE.height);
    this.textures.addCanvas('sky', c);
    this.add.image(TUNE.width / 2, TUNE.height / 2, 'sky').setScrollFactor(0).setDepth(-50);
  }

  addPlank(x, y, len) {
    const c = document.createElement('canvas');
    c.width = len; c.height = TUNE.plankHeight;
    const ctx = c.getContext('2d');
    const H = TUNE.plankHeight;
    const P = PAL;
    // --- Draw a horizontal wooden LOG (brown bark body + bright top face) ---
    // Wood body: bark / wood block.
    ctx.fillStyle = P.plankWhole;
    ctx.fillRect(0, 3, len, H - 4);
    // Top-to-bottom shading on the body (darker near the top).
    ctx.fillStyle = P.plankWholeDark;
    ctx.fillRect(0, 3, len, (H - 4) / 2);
    // Vertical wood-grain lines across the body.
    ctx.strokeStyle = P.plankRing;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 6; i < len; i += 12) { ctx.moveTo(i, 3); ctx.lineTo(i, H - 1); }
    ctx.stroke();
    // Rough-bark edge ticks near the bottom.
    ctx.strokeStyle = P.plankEdge;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    for (let i = 6; i < len; i += 10) { ctx.moveTo(i, H - 7); ctx.lineTo(i + 5, H - 3); }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Bright TOP landing face - the runner stands on this.
    ctx.fillStyle = P.plankTop;
    ctx.fillRect(0, 0, len, 7);
    ctx.fillStyle = P.plankTopHi;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 2, len, 2);                     // highlight line on the top
    ctx.globalAlpha = 1;
    // Soft shadow cast by the log onto whatever is below.
    ctx.fillStyle = '#2e2418';
    ctx.globalAlpha = 0.18;
    ctx.fillRect(0, H - 3, len, 3);
    ctx.globalAlpha = 1;

    this.textures.addCanvas('plank' + len, c);

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
    // Draw the runner frames on a plain canvas (reliable colors) and
    // register them as textures.
    const draw = (ctx, tuck) => {
      // Cap (accent).
      ctx.fillStyle = PAL.playerAccent;
      ctx.fillRect(3, 2, 16, 6);
      // Head + torso (rounded), in the runner's dark color.
      ctx.fillStyle = PAL.player;
      ctx.fillRect(3, 7, 16, 4);
      ctx.beginPath();
      ctx.moveTo(6, 12); ctx.lineTo(19, 12);
      ctx.quadraticCurveTo(22, 12, 22, 15);
      ctx.lineTo(22, 27);
      ctx.quadraticCurveTo(22, 30, 19, 30);
      ctx.lineTo(6, 30);
      ctx.quadraticCurveTo(3, 30, 3, 27);
      ctx.lineTo(3, 15);
      ctx.quadraticCurveTo(3, 12, 6, 12);
      ctx.fill();
      const grey = '#6a6053';
      if (!tuck) {
        // Run frame: legs apart (mid stride), arm swung at side.
        ctx.fillStyle = PAL.player;
        ctx.fillRect(5, 29, 5, 6);       // rear leg
        ctx.fillRect(12, 28, 5, 7);      // front leg
        ctx.fillRect(6, 33, 5, 3);       // rear foot
        ctx.fillRect(12, 33, 6, 3);      // front foot
        ctx.fillStyle = grey;
        ctx.fillRect(1, 34, 20, 2);      // arm at side
      } else {
        // Jump frame: legs tucked under the body, arm up / forward.
        ctx.fillStyle = PAL.player;
        ctx.fillRect(5, 27, 6, 5);       // tucked thigh
        ctx.fillRect(12, 27, 6, 5);      // tucked thigh
        ctx.fillRect(5, 31, 6, 3);       // tucked shin
        ctx.fillRect(12, 31, 6, 3);      // tucked shin
        ctx.fillStyle = grey;
        ctx.fillRect(1, 20, 6, 12);      // arm up / forward
        ctx.fillStyle = PAL.player;
        ctx.fillRect(15, 20, 5, 5);      // other arm back
      }
    };

    const r = document.createElement('canvas');
    r.width = 22; r.height = 36; draw(r.getContext('2d'), false);
    this.textures.addCanvas('runner-run', r);

    const j = document.createElement('canvas');
    j.width = 22; j.height = 36; draw(j.getContext('2d'), true);
    this.textures.addCanvas('runner-jump', j);

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


function randInt(lo, hi) { return lo + Math.floor(Math.random() * (hi - lo)); }

// Return a darkened (or lightened, mult>1) version of a #rrggbb color.
function shade(hex, mult) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * mult)));
  g = Math.max(0, Math.min(255, Math.round(g * mult)));
  b = Math.max(0, Math.min(255, Math.round(b * mult)));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
