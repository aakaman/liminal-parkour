// Procedural "glitch" sound — no audio asset needed.
//
// A short, digital-tape-crumble burst: a tight stutter of high-frequency
// noise cuts through a rapid descending pitch bend, with a staccato square
// "blip" layered on top. It reads as data corruption — the audio signature
// that pairs with the color-inversion death flash before respawning.
//
// Built directly on Phaser's AudioContext (same as the wind ambience) so it
// obeys the same browser autoplay-unlock rules.
export function playGlitch(audioCtx) {
  const ctx =
    audioCtx ||
    (typeof AudioContext !== 'undefined' ? new AudioContext() : null);
  if (!ctx) return;             // headless / unsupported: stay silent
  if (ctx.state === 'suspended') {
    const p = ctx.resume && ctx.resume();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  const t0 = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 1;
  out.connect(ctx.destination);

  // --- Layer 1: bit-crushed white-noise burst (the "digital crumble") ---
  // A short buffer of noise, looped and chopped with a fast square LFO so it
  // stutters; a lowpass that snaps shut mid-burst gives it that memory-card
  // failure feel.
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuffer(ctx, 0.3);
  noiseSrc.loop = true;

  const nLevel = ctx.createGain();
  const noiseEnv = ctx.createGain();
  noiseEnv.gain.setValueAtTime(0, t0);
  noiseEnv.gain.linearRampToValueAtTime(0.5, t0 + 0.012);
  noiseEnv.gain.exponentialRampToValueAtTime(0.001, t0 + 0.5);

  const nFilter = ctx.createBiquadFilter();
  nFilter.type = 'lowpass';
  nFilter.frequency.setValueAtTime(8200, t0);
  nFilter.frequency.exponentialRampToValueAtTime(420, t0 + 0.42);

  // Stutter chopper so the noise "flutters" like corrupted frames.
  const chop = ctx.createOscillator();
  chop.frequency.value = 42;
  const chopAmt = ctx.createGain();
  chopAmt.gain.value = 0.5;
  chop.connect(chopAmt);
  chopAmt.connect(nLevel.gain);

  noiseSrc.connect(nFilter);
  nFilter.connect(noiseEnv);
  noiseEnv.connect(nLevel);
  nLevel.connect(out);

  chop.start(t0);
  chop.stop(t0 + 0.5);
  noiseSrc.start(t0);
  noiseSrc.stop(t0 + 0.5);

  // --- Layer 2: rapid descending pitch stop (the "error tone") ---
  // A short sawtooth note that drops two octaves in a few ms, repeated over
  // three stutter taps — the classic "selected clip" / system-failure chirp.
  for (let i = 0; i < 3; i++) {
    const ts = t0 + i * 0.09;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, ts);
    osc.frequency.exponentialRampToValueAtTime(260, ts + 0.075);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.22, ts);
    g.gain.exponentialRampToValueAtTime(0.001, ts + 0.085);

    osc.connect(g);
    g.connect(out);
    osc.start(ts);
    osc.stop(ts + 0.09);
  }

  // --- Layer 3: short high blip on the very last frame (the "reset" hit) ---
  const blip = ctx.createOscillator();
  blip.type = 'square';
  blip.frequency.setValueAtTime(900, t0 + 0.46);
  blip.frequency.exponentialRampToValueAtTime(220, t0 + 0.56);
  const blipGain = ctx.createGain();
  blipGain.gain.setValueAtTime(0.001, t0 + 0.46);
  blipGain.gain.linearRampToValueAtTime(0.3, t0 + 0.47);
  blipGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.58);
  blip.connect(blipGain);
  blipGain.connect(out);
  blip.start(t0 + 0.46);
  blip.stop(t0 + 0.58);
}

// One short channel of white noise for the crumble layer.
function noiseBuffer(ctx, seconds) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}
