import Phaser from 'phaser';
import { TUNE, PAL } from './core.js';
import { WindAmbience } from './wind.js';

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

    // Low-lying drift of fog at the bottom of the screen - a liminal void.
    this.makeSmoke();

    this.cameras.main.startFollow(this.player, false, 0.1, 0.1);
    this.cameras.main.setDeadzone(140, 80);

    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,W,A,S,D');

    this.distance = 0;
    this.hud = this.add.text(16, 12, '0 m', {
      fontFamily: 'monospace', fontSize: '24px', color: '#2a2724',
    }).setDepth(20);
        this.add.text(TUNE.width / 2, 22, 'WASD / arrows - move freely across the logs', {
      fontFamily: 'monospace', fontSize: '15px', color: '#4a443c',
    }).setOrigin(0.5, 0).setDepth(20);

    // Ambient wind: procedural, plays from the first input (autoplay rules).
    this.wind = new WindAmbience(this.sound ? this.sound.context : null);
    this.wind.start();
    const unlockWind = () => this.wind.start();
    this.input.keyboard.once('keydown', unlockWind);
    this.input.once('pointerdown', unlockWind);
    this.events.once('shutdown', () => this.wind.stop());
  }

  makeSkyline() {
    // A unison row of identical two-floor family houses, all exactly the
    // same size and color, repeating into the distance. The eerie uniformity
    // gives the scene a liminal, "endless suburb" feeling.
    // A single shared texture is reused for every house, and new houses are
    // spawned on demand as the runner advances so they never run out.
    const w = 180;
    const h = 150;
    const scheme = { wall: '#d7c6a8', roof: '#8a6a52' };
    this._houseW = w;
    this._houseH = h;
    this._houseStep = w + 160;                 // house + gap spacing
    this._skyStartX = -700;
    this._nextHouseX = this._skyStartX;
    this.houses = [];

    // Build the one shared house texture.
    this.makeHouseTexture(scheme, w, h);

    // Seed the first houses so the view is never empty at spawn.
    this.fillSkyline();
  }

  makeHouseTexture(scheme, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const wall = scheme.wall;
    const roof = scheme.roof;
    const wallDark = shade(wall, 0.85);
    const roofDark = shade(roof, 0.8);
    const rim = shade(wall, 0.7);

    // Main two-storey body.
    ctx.fillStyle = wall;
    ctx.fillRect(2, 8, w - 4, h - 8);

    // Floor line separating the two storeys.
    ctx.fillStyle = rim;
    ctx.fillRect(2, h / 2, w - 4, 3);

    // ---- Roof: pitched triangle over the house body. ----
    const roofH = h * 0.32;
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.lineTo(w / 2, -roofH + 2);
    ctx.lineTo(w, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = roofDark;
    ctx.fillRect(0, 8, w, 3);   // eave shadow

    // ---- Upper floor: two windows. ----
    const uw = Math.floor(w * 0.22);
    const uh = Math.floor((h / 2 - 20) * 0.5);
    const gapU = Math.floor((w - 2 - uw * 2) / 3);
    for (let k = 0; k < 2; k++) {
      drawWindow(ctx, gapU + k * (uw + gapU), 18, uw, uh, wallDark);
    }

    // ---- Lower floor: a door and one window. ----
    const doorW = Math.floor(w * 0.2);
    const doorH = Math.floor(h / 2 - 10);
    const doorX = Math.floor((w - doorW) / 2);
    ctx.fillStyle = roofDark;
    ctx.fillRect(doorX, h - doorH - 4, doorW, doorH);   // door
    ctx.fillStyle = '#e8cf8a';                          // lit panel
    ctx.fillRect(doorX + 2, h - doorH - 2, doorW - 4, 4);
    const wWin = Math.floor(w * 0.2);
    const hWin = Math.floor((h / 2 - 14) * 0.55);
    drawWindow(ctx, 14, h / 2 + 8, wWin, hWin, wallDark);

    if (!this.textures.exists('bldg-house')) this.textures.addCanvas('bldg-house', c);
  }

  spawnHouse(x) {
    const img = this.add.image(x + this._houseW / 2, TUNE.groundY - this._houseH / 2, 'bldg-house');
    img.setScrollFactor(0.7, 1);
    img.setDepth(-40);
    this.houses.push(img);
    return img;
  }

  // Spawn enough houses to always fill the visible view to the right,
  // and drop houses that have scrolled well off to the left of the view.
  // Houses use a parallax scrollFactor of 0.7, so their on-screen position is
  // (worldX - scrollX * 0.7). All bounds here compare in that parallax space.
  fillSkyline() {
    const PARALLAX = 0.7;
    const hs = this.cameras.main.scrollX * PARALLAX;   // effective house-scroll
    const ahead = TUNE.width * 1.6;                    // fill ~1.6 screens ahead
    while (this._nextHouseX - hs < ahead) {
      this.spawnHouse(this._nextHouseX);
      this._nextHouseX += this._houseStep;
    }
    const keepBehind = TUNE.width * 0.5;               // a half screen off-left
    while (this.houses.length) {
      const h0 = this.houses[0];
      if (h0.x + this._houseW - hs < -keepBehind) {
        h0.destroy();
        this.houses.shift();
      } else {
        break;
      }
    }
  }

  makePlanks() {
    this.planks = this.physics.add.staticGroup();
    // A wide, flat starting base so the runner spawns grounded before climbing.
    let x = -80;
    let topY = TUNE.startTop;
    this.addPlank(x, topY, TUNE.logHMin, TUNE.logStartW);
    x += TUNE.logStartW;
    // Then tall vertical logs, ascending as you hop from top to top.
    // They repeat more frequently than the old flat planks (tighter gaps).
    for (let i = 0; i < 80; i++) {
      topY = nextTop(topY);
      const h = rand(TUNE.logHMin, TUNE.logHMax);
      this.addPlank(x, topY, h);
      x += TUNE.logWidth + rand(TUNE.gapMin, TUNE.gapMax);
    }
  }

  // A soft, pale haze puff used by the bottom fog. Radial gradient so the
  // edges are transparent and puffs blend into the sky.
  makeSmokeTexture() {
    const size = 128;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size/2, size/2, 4, size/2, size/2, size/2);
    g.addColorStop(0, 'rgba(240,236,226,0.55)');
    g.addColorStop(0.5, 'rgba(232,227,214,0.28)');
    g.addColorStop(1, 'rgba(220,214,200,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    if (!this.textures.exists('smokepuff')) this.textures.addCanvas('smokepuff', c);
  }

  // Spawn a drifting pool of fog puffs anchored to the bottom of the viewport.
  // They rise slowly, widen, and fade - an endless liminal haze from below.
  makeSmoke() {
    this.makeSmokeTexture();
    this.smokePuffs = [];
    const COUNT = 40;
    for (let i = 0; i < COUNT; i++) {
      const sp = this.add.image(
        (i / COUNT) * TUNE.width + rand(-40, 40),
        TUNE.height + rand(-30, 60),
        'smokepuff'
      );
      sp.setScrollFactor(0);
      sp.setDepth(8);                       // above logs, below the runner/HUD
      sp.setTint(0xefe9d8);
      this.smokePuffs.push({
        sp,
        vx: rand(-14, 14),
        vy: rand(-34, -20),
        grow: rand(0.45, 0.85),
        x0: rand(0, TUNE.width),
        maxLife: rand(6000, 9000),
        life: rand(0, 9000),
      });
      this.resetPuff(this.smokePuffs[i], true);
    }
  }

  // (Re)place a puff at the bottom with fresh random motion.
  resetPuff(p, soft) {
    const yBase = TUNE.height + rand(20, 90);
    p.sp.setPosition(rand(-40, TUNE.width + 40), yBase);
    p.sp.setAlpha(0.0);
    p.sp.setScale(rand(0.5, 0.9));
    p.vx = rand(-14, 14);
    p.vy = rand(-34, -20);
    p.grow = rand(0.45, 0.85);
    p.maxLife = rand(6000, 9000);
    p.life = soft ? rand(0, p.maxLife) : 0;
    p.sp.setVisible(true);
  }

  updateSmoke(delta) {
    if (!this.smokePuffs) return;
    const dt = Math.min(delta, 50);
    // How low the runner is: sy = screen y of the runner (0 = top, ~540 = bottom).
    // The closer the runner is to the bottom, the denser and brighter the fog.
    const sy = this.player.y - this.cameras.main.scrollY;
    const lowFactor = Math.max(0, Math.min(1, (sy - 200) / 170));
    for (const p of this.smokePuffs) {
      p.life += dt;
      // Fade in quickly, drift up and sideways, then fade out as it ages.
      // Base fog is always there; sinking lowers the base, thickens, and
      // also lets puffs sit higher toward the runner.
      const IN = 900;                       // ms to reach full colour
      const t = p.life / p.maxLife;
      const maxA = 0.28 + 0.5 * lowFactor;  // faint up high, thick down low
      let a = Math.min(1, p.life / IN) * maxA * (1 - t * t);
      if (a <= 0.01) a = 0;
      p.sp.setAlpha(a);
      p.sp.setScale(0.5 + (p.grow + lowFactor * 0.5) * t);
      p.sp.x += p.vx * (dt / 1000);
      p.sp.y += (p.vy - lowFactor * 14) * (dt / 1000);
      // Respawn once it has dispersed (aged out or drifted above view).
      if (p.life >= p.maxLife || p.sp.y < -80) this.resetPuff(p, false);
    }
    // Expose for headless checks.
    if (typeof window !== 'undefined') window.__smokeAmount = lowFactor;
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
    if (!this.textures.exists('sky')) this.textures.addCanvas('sky', c);
    this.add.image(TUNE.width / 2, TUNE.height / 2, 'sky').setScrollFactor(0).setDepth(-50);
  }

  // A vertical wooden log with a bright top cap the runner lands on.
  // x is the log's left edge, topY its top (cap) elevation, h its height,
  // w its horizontal thickness (the cap width).
  addPlank(x, topY, h, w = TUNE.logWidth) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const P = PAL;
    // Bark / wood body filling the log.
    ctx.fillStyle = P.plankWhole;
    ctx.fillRect(2, 4, w - 4, h - 4);
    ctx.fillStyle = P.plankWholeDark;
    ctx.fillRect(2, 4, 2, h - 4);                    // dark edge shading
    // Horizontal tree rings (grain running down the log).
    ctx.strokeStyle = P.plankRing;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 7; i < h; i += 14) { ctx.moveTo(2, i); ctx.lineTo(w - 2, i); }
    ctx.stroke();
    // Rough-bark ticks along both sides.
    ctx.fillStyle = P.plankEdge;
    ctx.globalAlpha = 0.4;
    for (let i = 7; i < h; i += 12) { ctx.fillRect(0, i, 2, 4); ctx.fillRect(w - 2, i, 2, 4); }
    ctx.globalAlpha = 1;
    // Bright TOP landing cap - the runner stands on this.
    ctx.fillStyle = P.plankTop;
    ctx.fillRect(0, 0, w, 7);
    ctx.fillStyle = P.plankTopHi;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 2, w, 2);                        // highlight on the cap
    ctx.globalAlpha = 1;
    // Soft shadow along the bottom edge.
    ctx.fillStyle = '#2e2418';
    ctx.globalAlpha = 0.18;
    ctx.fillRect(0, h - 3, w, 3);
    ctx.globalAlpha = 1;

    const key = 'plankv' + w + '_' + h;
    if (!this.textures.exists(key)) this.textures.addCanvas(key, c);

    const plank = this.planks.create(x + w / 2, topY + h / 2, key);
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
    if (!this.textures.exists('runner-run')) this.textures.addCanvas('runner-run', r);

    const j = document.createElement('canvas');
    j.width = 22; j.height = 36; draw(j.getContext('2d'), true);
    if (!this.textures.exists('runner-jump')) this.textures.addCanvas('runner-jump', j);

    // Spawn feet ON TOP of the starting base's cap.
    const spawnY = TUNE.startTop - 18 - 2;
    this.player = this.physics.add.sprite(TUNE.spawnX, spawnY, 'runner-run');
    this.player.setDepth(10);
    this.player.setScale(1);
    this.player.body.collideWorldBounds = true;   // stay inside the play area
  }

  update(time, delta) {
    const p = this.player;

    this.fillSkyline();
    this.updateSmoke(delta);

    // Free movement: WASD / arrow keys set velocity in both axes.
    // Horizontal: left/right. Vertical: up (hold to climb), down (hold to sink).
    const moveLeft  = this.keys.LEFT.isDown || this.keys.A.isDown;
    const moveRight = this.keys.RIGHT.isDown || this.keys.D.isDown;
    const moveUp    = this.keys.UP.isDown  || this.keys.W.isDown;
    const moveDown  = this.keys.DOWN.isDown|| this.keys.S.isDown;
    p.setVelocityX((moveRight ? 1 : 0) * TUNE.runSpeed + (moveLeft ? -1 : 0) * TUNE.runSpeed);
    if (moveUp) p.setVelocityY(-TUNE.climbSpeed);
    else if (moveDown) p.setVelocityY(TUNE.climbSpeed);
    // No vertical input: leave velocity.y alone so gravity pulls the runner
    // down onto a cap (it rests there). Flip the run/jump frame on movement.
    this.applyRunFrame();

    const ground = p.body.blocked.down || p.body.touching.down;
    // Track furthest point reached, not oscillating position.
    this.distance = Math.max(this.distance || 0, Math.floor(p.x / 40));
    this.hud.setText(this.distance + ' m');

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
      // Next log cap ahead: [x0, x1]; higher = its top is above the runner's
      // feet (needs a jump). null if none ahead.
      let cap = null;
      let capHigher = false;
      if (this.planks.children) {
        const entries = this.planks.children.entries;
        for (const pl of entries) {
          if (!pl || !pl.body) continue;
          const ptop = pl.y - pl.displayHeight / 2;
          const x0 = pl.x - pl.displayWidth / 2;
          if (x0 > p.x + 6) {
            cap = [x0, x0 + pl.displayWidth];
            capHigher = ptop < p.y - 12;
            break;
          }
        }
      }
      window.__nextCap = cap;
      window.__nextCapHigher = capHigher;
      window.__runnerBody = { x: p.body.x, y: p.body.y, w: p.body.width, h: p.body.height };
      window.__wind = {
        on: this.wind.isActive(),
        ctxState: this.wind.ctx ? this.wind.ctx.state : 'none',
      };
    }

    // Fail when the runner drops below the world.
    if (p.y > TUNE.height + 140) {
      this.scene.restart();
    }

    // Wind reacts to how fast the runner is cutting through the air.
    this.wind.update(p.body.velocity.x, p.body.velocity.y);

  }

  // Keep the runner in its run frame and facing the way it's moving.
  applyRunFrame() {
    const p = this.player;
    if (p.texture && p.texture.key !== 'runner-run') p.setTexture('runner-run');
    p.setFlipX(p.body.velocity.x < -1);
    p.setScale(1, 1);
  }
}



// Draw a warm, lit window with a frame on the given context.
function drawWindow(ctx, x, y, w, h, frame) {
  ctx.fillStyle = frame;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#f0d27a';      // warm glow
  ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';   // glass gleam
  ctx.fillRect(x + 3, y + 3, Math.max(2, Math.floor((w - 6) / 2)), 2);
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

// Next log-top elevation: mainly climb upward (within the reachable band),
// stepping back down a little once it gets too high so the run stays bounded.
function nextTop(prev) {
  // Smaller y = higher on screen. Mostly climb upward; allow only small
  // descents so a run-off always lands on the close next cap. Stay in band.
  const up = Math.random() < 0.7;
  const n = up
    ? prev - TUNE.climbStep * (0.3 + Math.random() * 0.8)
    : prev + TUNE.descendStep * Math.random();
  return Math.max(TUNE.logTopHigh, Math.min(TUNE.logTopMax, n));
}
