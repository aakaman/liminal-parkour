import Phaser from 'phaser';
import { TUNE, PAL } from './core.js';
import { WindAmbience } from './wind.js';
import { playGlitch } from './glitch.js';

// ============================================================================
// LIMINAL PARKOUR — pseudo-3D first-person view
// ----------------------------------------------------------------------------
// The classic side-scroller is re-staged as an endless first-person forward
// run down a receding avenue of log caps, with family houses flanking both
// sides and converging to a vanishing point at the horizon. The world is
// rendered with a simple perspective billboard projection (objects grow and
// drop toward the camera as they approach, shrinking into the distance), so
// it reads as true forward depth without a 3D engine.
//
// All of the original mechanics are preserved:
//   - auto-forward run + single/double jump (Space / W / Up)
//   - hold S/Down to drop faster, gentle climb/descend caps
//   - fall into the void below the path -> color-inversion death flash +
//     procedural glitch sound + camera shake -> respawn at spawn
//   - procedural wind ambience, liminal bottom fog, endless distance HUD
// ============================================================================

export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Game' });
  }

  create() {
    // Fixed camera at eye level, looking down the forward axis.
    this.cameras.main.setBackgroundColor(PAL.skyBottom);

    // Vanishing point (horizon center) and perspective focal length.
    this.horizonY = 150;
    this.vpx = TUNE.width / 2;
    this.f = 420;

    // Movement state: forward position along the path.
    this.runZ = 0;
    this.vz = 0;
    this.yPos = TUNE.startTop;
    this.vy = 0;
    this.grounded = true;
    this._airJumps = 0;
    this._jumpPrev = false;
    this.lane = 0;        // lateral lane (-1,0,1) — steer with A / D
    this.dying = false;
    this._deathTime = 0;

    this.distance = 0;
    this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,W,A,S,D,SPACE');

    // Build the endless, receding course of log caps and flanking houses.
    this.makeLogPath();
    this.makeHouses();
    this.makeSkylineBackdrop();
    this.makeFog();
    this.makeLandingMarker();

    // HUD.
    this.hud = this.add.text(16, 12, '0 m', {
      fontFamily: 'monospace', fontSize: '24px', color: '#2a2724',
    }).setDepth(20);
    this.add.text(TUNE.width / 2, 22, 'WASD / arrows — run forward, jump the gaps',
      { fontFamily: 'monospace', fontSize: '15px', color: '#4a443c' })
      .setOrigin(0.5, 0).setDepth(20);

    // Procedural wind, unlocked by the first input (autoplay rules).
    this.wind = new WindAmbience(this.sound ? this.sound.context : null);
    this.wind.start();
    const unlockWind = () => this.wind.start();
    this.input.keyboard.once('keydown', unlockWind);
    this.input.once('pointerdown', unlockWind);
    this.events.once('shutdown', () => this.wind.stop());

    if (typeof window !== 'undefined') {
      window.__dying = false;
      window.__grounded = true;
    }
  }

  // ---- Perspective projection helpers ----
  project(worldX, worldY, z) {
    const s = this.f / (this.f + z);
    const camH = this.viewY || 0; // downward screen shift from the runner's height
    return { x: this.vpx + worldX * s, y: this.horizonY + (worldY - this.horizonY) * s - camH, s };
  }

  groundY(z) {
    return TUNE.height + z * 0.25;
  }

  // ---- Receding log path ----
  makeLogPath() {
    this.caps = [];
    this._nextZ = 0;
    this._capTop = 0;
    this._capLane = 0;
    this.makeCapTexture();
    this.caps.push(this.makeCap(40, 0, 0, 220));
    this._nextZ = 40 + 220;
    this.fillPath();
  }

  makeCapTexture() {
    if (this.textures.exists('cap')) return;
    // A standing log stump seen from head-on: a bright circular top (the
    // landing cap) above a bark body that drops into the void. Reading as a
    // real log makes gaps and pits obvious so jumping/losing is clear.
    const TW = 96;        // top diameter (and sprite width)
    const BODY = 240;     // bark body height below the top
    const R = TW / 2;
    const c = document.createElement('canvas');
    c.width = TW; c.height = TW + BODY;
    const ctx = c.getContext('2d');
    const P = PAL;
    // Bark body (vertical log trunk).
    ctx.fillStyle = P.plankWhole;
    ctx.fillRect(R - R + 4, R, TW - 8, BODY);
    ctx.fillStyle = P.plankWholeDark;
    ctx.fillRect(2, R, 6, BODY);            // left shading
    ctx.fillStyle = 'rgba(40,26,12,0.35)';
    ctx.fillRect(TW - 8, R, 6, BODY);       // right shadow
    // Bark grain ticks.
    ctx.strokeStyle = P.plankRing; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
    for (let y = R + 18; y < R + BODY - 8; y += 26) {
      ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(TW - 8, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Rounded top of the trunk (slight ridge above the body).
    ctx.fillStyle = P.plankWhole;
    ctx.beginPath(); ctx.ellipse(R, R, R - 2, 10, 0, 0, Math.PI * 2); ctx.fill();
    // Bright exposed log end (the landing face).
    const shine = ctx.createRadialGradient(R - 10, R - 12, 6, R, R - 6, R + 2);
    shine.addColorStop(0, P.plankTopHi);
    shine.addColorStop(0.45, P.plankTop);
    shine.addColorStop(0.8, P.plankWhole);
    shine.addColorStop(1, P.plankEdge);
    ctx.fillStyle = shine;
    ctx.beginPath(); ctx.ellipse(R, R, R - 2, 10, 0, 0, Math.PI * 2); ctx.fill();
    // Grain rings in the exposed face.
    ctx.strokeStyle = P.plankRing; ctx.globalAlpha = 0.55; ctx.lineWidth = 2;
    for (let r = 12; r < R - 6; r += 7) {
      ctx.beginPath(); ctx.ellipse(R, R, r, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    this.textures.addCanvas('cap', c);
  }

  makeCap(z, lane, top, radius) {
    const img = this.add.image(0, 0, 'cap');
    img.setAlpha(0);
    img.setDepth(5);
    this.caps.push({ img, z, lane, top, r: radius, live: true });
    return this.caps[this.caps.length - 1];
  }

  fillPath() {
    const POP_AHEAD = this.f * 6;
    while (this._nextZ < this.runZ + POP_AHEAD) {
      const gap = Phaser.Math.Between(70, 120);
      this._nextZ += gap + 40;
      const goUp = Phaser.Math.FloatBetween(0, 1) < 0.5;
      const delta = goUp
        ? -Phaser.Math.Between(12, TUNE.climbStep)
        : Phaser.Math.Between(-TUNE.descendStep, TUNE.descendStep);
      this._capTop = Math.max(-340, Math.min(TUNE.logTopMax, this._capTop + delta));
      const r = 26;
      this.makeCap(this._nextZ, this._capLane, this._capTop, r);
    }
    while (this.caps.length && this.caps[0].z < this.runZ - 320) {
      this.caps[0].img.destroy();
      this.caps.shift();
    }
  }

  // ---- Flanking houses ----
  makeHouses() {
    this.houses = [];
    this._nextHouseZ = 20;
    this.makeHouseTexture();
    this.fillHouses();
  }

  makeHouseTexture() {
    if (this.textures.exists('bldg-house')) return;
    const w = 180, h = 150;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const wall = '#d7c6a8', roof = '#8a6a52';
    const wallDark = shade(wall, 0.85), roofDark = shade(roof, 0.8), rim = shade(wall, 0.7);
    ctx.fillStyle = wall; ctx.fillRect(2, 8, w - 4, h - 8);
    ctx.fillStyle = rim; ctx.fillRect(2, h / 2, w - 4, 3);
    const roofH = h * 0.32;
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(0, 10); ctx.lineTo(w / 2, -roofH + 2); ctx.lineTo(w, 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = roofDark; ctx.fillRect(0, 8, w, 3);
    const uw = Math.floor(w * 0.22), uh = Math.floor((h / 2 - 20) * 0.5);
    const gapU = Math.floor((w - 2 - uw * 2) / 3);
    for (let k = 0; k < 2; k++) drawWindow(ctx, gapU + k * (uw + gapU), 18, uw, uh, wallDark);
    const doorW = Math.floor(w * 0.2), doorH = Math.floor(h / 2 - 10);
    const doorX = Math.floor((w - doorW) / 2);
    ctx.fillStyle = roofDark; ctx.fillRect(doorX, h - doorH - 4, doorW, doorH);
    ctx.fillStyle = '#e8cf8a'; ctx.fillRect(doorX + 2, h - doorH - 2, doorW - 4, 4);
    drawWindow(ctx, 14, h / 2 + 8, Math.floor(w * 0.2), Math.floor((h / 2 - 14) * 0.55), wallDark);
    this.textures.addCanvas('bldg-house', c);
  }

  fillHouses() {
    const POP = this.f * 7;
    while (this._nextHouseZ < this.runZ + POP) {
      for (let si = 0; si < 2; si++) {
        const side = si === 0 ? -1 : 1;
        const img = this.add.image(0, 0, 'bldg-house');
        img.setAlpha(0); img.setDepth(-40);
        this.houses.push({ img, z: this._nextHouseZ, side,
          lane: Phaser.Math.Between(220, 420), top: Phaser.Math.Between(30, 130) });
      }
      this._nextHouseZ += Phaser.Math.Between(180, 320);
    }
    while (this.houses.length && this.houses[0].z < this.runZ - 260) {
      this.houses[0].img.destroy();
      this.houses.shift();
    }
  }

  // ---- Sky + distant ground plane ----
  makeSkylineBackdrop() {
    if (!this.textures.exists('sky')) {
      const c = document.createElement('canvas');
      c.width = TUNE.width; c.height = TUNE.height;
      const ctx = c.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, TUNE.height);
      grad.addColorStop(0, PAL.skyTop);
      grad.addColorStop(0.3, PAL.skyBottom);
      grad.addColorStop(1, '#efe9da');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, TUNE.width, TUNE.height);
      this.textures.addCanvas('sky', c);
    }
    this.add.image(TUNE.width / 2, TUNE.height / 2, 'sky').setScrollFactor(0).setDepth(-50);
    const g = this.add.graphics().setDepth(-45).setScrollFactor(0);
    const gy = TUNE.height, hy = this.horizonY;
    g.fillStyle(0xd6cdbf, 0.6);
    g.fillPoints([
      new Phaser.Geom.Point(0, hy + 2),
      new Phaser.Geom.Point(TUNE.width, hy + 2),
      new Phaser.Geom.Point(TUNE.width, gy),
      new Phaser.Geom.Point(0, gy)
    ], true);
    // Dark pit below the path: the void between/around the logs. The log
    // stumps draw on top, so the gaps between them read as falling-into.
    var vg = this.add.graphics().setDepth(-42).setScrollFactor(0);
    var vgrad = vg.fillGradientStyle(0x3a3228, 0x3a3228, 0x191510, 0x191510, 1);
    vg.fillPoints([
      new Phaser.Geom.Point(0, hy + 24),
      new Phaser.Geom.Point(TUNE.width, hy + 24),
      new Phaser.Geom.Point(TUNE.width, gy),
      new Phaser.Geom.Point(0, gy)
    ], true);
    void vgrad;
  }

  // ---- Liminal fog ----
  makeFog() {
    if (!this.textures.exists('smokepuff')) {
      const size = 128, c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      const gg = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
      gg.addColorStop(0, 'rgba(240,236,226,0.55)');
      gg.addColorStop(0.5, 'rgba(232,227,214,0.28)');
      gg.addColorStop(1, 'rgba(220,214,200,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, 0, size, size);
      this.textures.addCanvas('smokepuff', c);
    }
    this.smokePuffs = [];
    const COUNT = 40;
    for (let i = 0; i < COUNT; i++) {
      const sp = this.add.image(0, TUNE.height + 20, 'smokepuff');
      sp.setScrollFactor(0); sp.setDepth(8); sp.setTint(0xefe9d8);
      this.smokePuffs.push({ sp, vx: rand(-14, 14), vy: rand(-34, -20),
        grow: rand(0.45, 0.85), x0: rand(0, TUNE.width),
        maxLife: rand(6000, 9000), life: rand(0, 9000) });
      this.resetPuff(this.smokePuffs[i], true);
    }
  }

  resetPuff(p, soft) {
    p.sp.x = rand(-40, TUNE.width + 40);
    p.sp.y = TUNE.height + rand(20, 90);
    p.sp.setAlpha(0);
    p.sp.setScale(rand(0.5, 0.9));
    p.vx = rand(-14, 14); p.vy = rand(-34, -20); p.grow = rand(0.45, 0.85);
    p.maxLife = rand(6000, 9000); p.life = soft ? rand(0, p.maxLife) : 0;
    p.sp.setVisible(true);
  }

  updateFog(delta) {
    const dt = Math.min(delta, 50);
    const f = Math.max(0, Math.min(1, (this.yPos - TUNE.startTop) / 340));
    for (let j = 0; j < this.smokePuffs.length; j++) {
      const p = this.smokePuffs[j];
      p.life += dt;
      const t = p.life / p.maxLife;
      const maxA = 0.28 + 0.5 * f;
      let a = Math.min(1, p.life / 900) * maxA * (1 - t * t);
      if (a <= 0.01) a = 0;
      p.sp.setAlpha(a);
      p.sp.setScale(0.5 + (p.grow + f * 0.5) * t);
      p.sp.x += p.vx * (dt / 1000);
      p.sp.y += (p.vy - f * 14) * (dt / 1000);
      if (p.life >= p.maxLife || p.sp.y < -80) this.resetPuff(p, false);
    }
    if (typeof window !== 'undefined') window.__fog = Math.round(f * 100) / 100;
  }

  // ==========================================================================
  // MAIN UPDATE
  // ==========================================================================
  update(time, delta) {
    this.fillPath();
    this.fillHouses();
    this.updateFog(delta);

    if (!this.dying) {
      this.stepPhysics(time, delta);
      this.wind.update(this.vz, this.vy);
      this.hud.setText(Math.round(this.runZ / 40) + ' m');
      this.distance = Math.max(this.distance || 0, Math.floor(this.runZ / 40));
      if (typeof window !== 'undefined') {
        window.__px = Math.round(this.project(this.lane * 130, 0, this.runZ).x);
        window.__wind = { on: this.wind.isActive(), ctxState: this.wind.ctx ? this.wind.ctx.state : null };
        window.__py = Math.round(this.yPos);
        window.__pyVel = Math.round(this.vy);
        window.__grounded = this.grounded;
        window.__caps = this.caps.length;
      }
    } else if (time - this._deathTime >= TUNE.deathFlash) {
      this.scene.restart();
    } else if (typeof window !== 'undefined') {
      window.__pyVel = Math.round(this.vy);
      window.__grounded = this.grounded;
    }

    // Velocity-based view dip: jumps kick the world down briefly and it
    // settles back to 0, so the camera never drifts toward a gray void.
    this.viewY = Math.max(-40, Math.min(40, -this.vy * 0.15));
    this.renderScene();
  }

  // ---- Forward run + jump physics ----
  stepPhysics(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.vz = TUNE.runSpeed;
    this.runZ += this.vz * dt;

    // lateral lane steering (first-person: weave between lanes with A / D)
    const left = this.keys.LEFT.isDown || this.keys.A.isDown;
    const right = this.keys.RIGHT.isDown || this.keys.D.isDown;
    if (right) this.lane = Math.min(1, this.lane + 0.05);
    if (left) this.lane = Math.max(-1, this.lane - 0.05);
    const jumpHeld = this.keys.SPACE.isDown || this.keys.W.isDown || this.keys.UP.isDown;
    const moveDown = this.keys.DOWN.isDown || this.keys.S.isDown;

    // vertical physics (screen-y: smaller y = higher)
    this.vy += TUNE.gravity * dt * (this.grounded ? 0 : 1);
    this.yPos += this.vy * dt;
    if (moveDown && !this.grounded) this.vy = Math.min(this.vy, TUNE.climbSpeed);

    if (jumpHeld && !this._jumpPrev) {
      if (this.grounded) {
        this.vy = -TUNE.jumpVelocity;
        this.grounded = false;
        this._airJumps = 0;
      } else if (this._airJumps === 0) {
        this.vy = -TUNE.doubleJumpVelocity;
        this._airJumps = 1;
      }
    }
    this._jumpPrev = jumpHeld;

    // Land on a log cap: the runner is "on" a cap while its feet span the
    // cap, and landing snaps to the cap top. Track the top of the last log
    // stood on so falling into a gap (the void) can be detected.
    let under = null;
    let landed = false;
    let underTopY = null;
    for (let i = 0; i < this.caps.length; i++) {
      const cap = this.caps[i];
      if (!cap.live) continue;
      const z0 = cap.z - cap.r, z1 = cap.z + cap.r;
      if (this.runZ >= z0 && this.runZ <= z1) {
        const capTopY = TUNE.startTop - cap.top;
        under = true;
        underTopY = capTopY;
        if (this.vy >= 0 && this.yPos >= capTopY - 8 && this.yPos <= capTopY + TUNE.climbStep) {
          this.grounded = true;
          this.yPos = capTopY;
          this.vy = 0;
          this._airJumps = 0;
          this._refTopY = capTopY;
          landed = true;
          break;
        }
      }
    }
    if (!landed && this.grounded) this.grounded = false;
    if (this._refTopY === null || this._refTopY === undefined) this._refTopY = TUNE.startTop;

    // Fallen into a gap/void: airborne, not over any cap, dropping, and
    // well below the last log's top -> the jump was missed, you lose.
    if (!this.grounded && !under && this.vy > 0 && this.yPos > this._refTopY + 200) {
      this.startDeath();
    }

    if (this.yPos > TUNE.height + TUNE.worldDeep - 200) {
      this.startDeath();
    }
  }

  // ---- Death flash ----
  startDeath() {
    this.dying = true;
    this._deathTime = this.time.now;
    this._invFx = this.cameras.main.postFX.addColorMatrix();
    this._invFx.negative();
    this.cameras.main.shake(TUNE.deathFlash, 0.012);
    playGlitch(this.sound ? this.sound.context : null);
    if (typeof window !== 'undefined') window.__dying = true;
  }

  // A bright "landing target" chevron that hovers over the next log you
  // need to jump onto, so the jump target is always obvious.
  makeLandingMarker() {
    if (!this.textures.exists('marker')) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const ctx = c.getContext('2d');
      ctx.strokeStyle = '#ffe9b0'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(32, 32, 22, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffe9b0';
      ctx.beginPath();
      ctx.moveTo(32, 44); ctx.lineTo(40, 56); ctx.lineTo(24, 56); ctx.closePath(); ctx.fill();
      this.textures.addCanvas('marker', c);
    }
    this.marker = this.add.image(0, 0, 'marker').setDepth(12).setAlpha(0.9);
    this._markerPulse = 0;
  }

  renderScene() {
    const NEAR = 4.2;   // legibility scale for a near log
    for (let i = 0; i < this.caps.length; i++) {
      const cap = this.caps[i];
      const dz = cap.z - this.runZ;
      if (dz < 8 || dz > this.f * 4) { cap.img.setVisible(false); continue; }
      // Perspective: near logs are wide and low, far logs shrink and rise
      // toward the horizon. Each log END uses cap.top for its HEIGHT, so
      // climbing logs visibly sit higher and dropping logs lower — this is
      // what makes "jump up to the next log" readable.
      const scl = this.f / (this.f + dz);
      const roadY = (this.horizonY + 30) + (TUNE.height - 40 - (this.horizonY + 30)) * (scl * scl);
      const y = roadY - cap.top * 0.55;
      const x = this.vpx - this.lane * 60 * (1 - scl);
      const k = scl * NEAR;    // NEAR set below for legibility
      // clamp so the log end stays on screen and readable
      cap.img.setVisible(true);
      cap.img.setOrigin(0.5, 0.155);
      cap.img.setPosition(x, y);
      cap.img.setScale(k, k);
      cap.img.setAlpha(1);
      cap.img.setTint(0xffffff);
    }

    for (let h = 0; h < this.houses.length; h++) {
      const ho = this.houses[h];
      const hz = ho.z - this.runZ;
      if (hz < 20 || hz > this.f * 5) { ho.img.setVisible(false); continue; }
      const worldX = ho.side * ho.lane - this.lane * 60;
      const p0 = this.project(worldX, this.groundY(hz), hz);
      const p1 = this.project(worldX, this.groundY(hz) - ho.top, hz);
      const wpx = 180 * p1.s, hpx = 150 * p1.s;
      if (wpx < 2 || hpx < 2) { ho.img.setVisible(false); continue; }
      ho.img.setVisible(true);
      ho.img.setPosition(p0.x, (p0.y + p1.y) / 2);
      ho.img.setScale(wpx / 180, hpx / 150);
      ho.img.setAlpha(0.35 + 0.65 * Math.min(1, p1.s * 1.4));  // stay visible with distance fade
      const stp1 = Math.min(1, p1.s * 1.2);
      const col = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(0xd7, 0xc6, 0xa8),
        new Phaser.Display.Color(0x8a, 0x7a, 0x60),
        1 - stp1, new Phaser.Display.Color());
      ho.img.setTint((col.red << 16) | (col.green << 8) | col.blue, 0xffffff, 0xffffff, 0xffffff);
    }

    // Bright landing-target chevron on the next log to jump onto.
    if (this.marker) {
      let next = null, best = Infinity;
      for (let i = 0; i < this.caps.length; i++) {
        const c = this.caps[i];
        const dz = c.z - this.runZ;
        if (dz > 60 && dz < best && c.img.visible) { best = dz; next = c; }
      }
      if (next) {
        const scl = this.f / (this.f + best);
        const roadY = (this.horizonY + 30) + (TUNE.height - 40 - (this.horizonY + 30)) * (scl * scl);
        const my = roadY - next.top * 0.55 - 30;
        const mx = this.vpx - this.lane * 60 * (1 - scl);
        this._markerPulse = (this._markerPulse || 0) + 0.12;
        const pw = 1 + Math.sin(this._markerPulse) * 0.25;
        this.marker.setVisible(true);
        this.marker.setPosition(mx, my);
        this.marker.setScale(pw, pw);
      } else {
        this.marker.setVisible(false);
      }
    }
  }
}

// ---- shared helpers ----
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255)) * f;
  const g = Math.round(((n >> 8) & 255)) * f;
  const b = Math.round((n & 255)) * f;
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function rand(min, max) { return Math.random() * (max - min) + min; }

function drawWindow(ctx, x, y, w, h, frame) {
  ctx.fillStyle = frame; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#f0d27a'; ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(x + 2, y + 2, (w - 4) / 2, 2);
  ctx.fillStyle = frame; ctx.fillRect(x + w / 2 - 1, y + 2, 2, h - 4);
  ctx.fillRect(x + 2, y + h / 2 - 1, w - 4, 2);
}
