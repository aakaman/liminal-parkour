// Procedural wind ambience — no audio asset needed.
//
// Built directly on the Web Audio graph (Phaser's AudioContext) so it obeys
// the same browser autoplay unlock rules as the rest of the sound manager.
// The sound is two drifting brown-noise beds (slightly different loop
// lengths, panned left/right) through a low-pass filter, plus a high-pass to
// keep it airy instead of rumbly. Two slow LFOs bring it to life: one breathes
// the filter cutoff (the "hushing" texture), one swells the level in soft
// gusts. The scene nudges the master level and cutoff with the runner's
// vertical speed, so a long dive rushes louder.
export class WindAmbience {
  constructor(audioCtx) {
    this.ctx =
      audioCtx ||
      (typeof AudioContext !== 'undefined' ? new AudioContext() : null);
    this.nodes = null;
  }

  // Idempotent: builds and wires the graph. Safe to call while the context is
  // still suspended (autoplay policy) — it just plays once the context runs.
  start() {
    const ctx = this.ctx;
    if (!ctx || this.nodes) return;
    try {
      this.nodes = buildWindGraph(ctx);
      resume(ctx);
    } catch {
      // Never let audio setup break the game (headless runs, odd browsers).
      this.nodes = null;
    }
  }

  // Called every frame with the runner's velocity so the wind reacts to motion.
  update(vx, vy) {
    const nodes = this.nodes;
    if (!nodes) return;
    const dive = Math.min(1, Math.abs(vy) / 900);
    // Falling harder -> louder, brighter (more "shhh") wind.
    const level = 0.055 + dive * 0.22;
    const cutoff = 420 + dive * 320;
    const t = this.ctx.currentTime;
    nodes.level.gain.setTargetAtTime(level, t, 0.18);
    nodes.filter.frequency.setTargetAtTime(cutoff, t, 0.25);
  }

  // True once the graph is wired up (playing, or waiting for a user gesture).
  isActive() {
    return !!this.nodes;
  }

  stop() {
    if (!this.nodes) return;
    try {
      const n = this.nodes;
      n.lfo.stop();
      n.gust.stop();
      n.sources.forEach((s) => s.stop());
      n.level.disconnect();
    } catch {
      // already stopped / never started
    }
    this.nodes = null;
  }
}

function buildWindGraph(ctx) {
  // One looped noise bed per side; loop lengths differ so the two channels
  // never drift in phase, which keeps the texture wide and alive.
  const mkChannel = (loopSeconds, pan) => {
    const src = ctx.createBufferSource();
    src.buffer = brownNoise(ctx, loopSeconds);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    filter.Q.value = 0.4;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 70;

    const chGain = ctx.createGain();
    chGain.gain.value = 1;

    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;

    src.connect(filter);
    filter.connect(hp);
    hp.connect(chGain);
    chGain.connect(panner);
    return { src, filter, panner };
  };

  const L = mkChannel(2.7, -0.55);
  const R = mkChannel(3.1, 0.55);

  // Slow LFO breathing on both filter cutoffs ("hushing" texture).
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.09;
  const lfoAmt = ctx.createGain();
  lfoAmt.gain.value = 240; // ±240 Hz around the base cutoff
  lfo.connect(lfoAmt);
  lfoAmt.connect(L.filter.frequency);
  lfoAmt.connect(R.filter.frequency);

  // Slightly faster LFO making soft gusts on the shared level (±40%).
  const gust = ctx.createOscillator();
  gust.frequency.value = 0.19;
  const gustAmt = ctx.createGain();
  gustAmt.gain.value = 0.4;
  const gustIn = ctx.createGain();
  gustIn.gain.value = 1;
  gust.connect(gustAmt);
  gustAmt.connect(gustIn.gain);

  const level = ctx.createGain();
  level.gain.value = 0.06;
  L.panner.connect(gustIn);
  R.panner.connect(gustIn);
  gustIn.connect(level);
  level.connect(ctx.destination);

  lfo.start();
  gust.start();
  L.src.start();
  R.src.start();

  return { filter: L.filter, level, lfo, gust, sources: [L.src, R.src] };
}

// One channel of integrated white noise (brown noise) — the wind's raw body.
function brownNoise(ctx, seconds) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.5;
  }
  // Gentle fade at the loop seam so looping never clicks.
  const fade = Math.min(Math.floor(ctx.sampleRate * 0.04), Math.floor(len / 4));
  for (let i = 0; i < fade; i++) {
    const t = i / fade;
    data[i] *= t;
    data[len - 1 - i] *= t;
  }
  return buf;
}

// Try to start the context now; browsers that demand a user gesture stay
// suspended and start on the first key/click instead. Never reject loudly.
function resume(ctx) {
  if (ctx.state === 'running') return;
  const p = ctx.resume && ctx.resume();
  if (p && typeof p.catch === 'function') p.catch(() => {});
}
