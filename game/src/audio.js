// Procedural sound for SOLMAR HEAT — every effect is synthesized with WebAudio,
// so the game ships no audio files at all. Created lazily on the first gesture,
// because browsers block audio before the player interacts.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;

  function ensure() {
    if (ctx) return ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
    } catch {
      ctx = null;
    }
    return ctx;
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure()) return;
    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      gain.gain.setValueAtTime(vol || 0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch { /* audio is decoration; never break the game */ }
  }

  function noise(dur, vol) {
    if (!ensure()) return;
    try {
      const t = ctx.currentTime;
      const len = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = vol || 0.2;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(t);
    } catch { /* ignore */ }
  }

  return {
    resume() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    engine(speed01, driving) {
      if (!ensure()) return;
      const target = driving ? 0.045 + speed01 * 0.05 : 0;
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(52 + speed01 * 130, ctx.currentTime, 0.08);
    },
    siren(wanted, dt) {
      if (!ensure()) return;
      if (wanted <= 0) { sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2); return; }
      sirenTimer += dt;
      const high = Math.floor(sirenTimer * 1.6) % 2 === 0;
      sirenOsc.frequency.setTargetAtTime(high ? 880 : 620, ctx.currentTime, 0.05);
      sirenGain.gain.setTargetAtTime(0.028, ctx.currentTime, 0.2);
    },
    gunshot() { noise(0.16, 0.25); },
    pickup() { blip(660, 0.12, 'sine', 0.14); setTimeout(() => blip(990, 0.18, 'sine', 0.14), 90); },
    cash() { blip(880, 0.1, 'triangle', 0.14, 1320); },
    crash() { noise(0.25, 0.18); blip(90, 0.2, 'sine', 0.16, 45); },
    click() { blip(520, 0.06, 'square', 0.06); },
    busted() { blip(440, 0.5, 'sawtooth', 0.1, 110); },
  };
}
