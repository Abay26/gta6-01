// All sound is synthesized live with WebAudio: no audio files, no network.
// Engine hum, sirens, punches, gunshots, pickups and three radio stations —
// Bay Wave synthwave, Solmar Salsa latin groove, Harbor Rock guitar drive —
// switched with R. Everything is guarded: with no gesture yet (or no
// AudioContext at all) every call is a silent no-op.
import { RADIO_STATIONS } from './config.js';
export function createAudio() {
  let ctx = null; let master = null; let muted = false;
  let engineOsc = null; let engineGain = null;
  let sirenOsc = null; let sirenGain = null;
  let musicTimer = null; let musicStep = 0;
  let station = 0;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    } catch { return false; }
    return true;
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(master); osc.start(); osc.stop(ctx.currentTime + dur);
  }
  function noise(dur, vol, filterFreq) {
    if (!ctx || muted) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = filterFreq;
    const gain = ctx.createGain(); gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(master); src.start();
  }
  const STATION_MUSIC = [
    { chords: [[110, 130.8, 164.8], [87.3, 110, 130.8], [130.8, 164.8, 196], [98, 123.5, 146.8]], bass: [55, 43.65, 65.4, 49], wave: 'triangle' },
    { chords: [[164.8, 196, 246.9], [146.8, 174.6, 220], [130.8, 164.8, 196], [174.6, 220, 261.6]], bass: [82.4, 73.4, 65.4, 87.3], wave: 'square' },
    { chords: [[110, 138.6, 164.8], [98, 123.5, 146.8], [123.5, 155.6, 185], [87.3, 110, 130.8]], bass: [55, 49, 61.7, 43.65], wave: 'sawtooth' },
  ];
  function musicTick() {
    if (!ctx || muted) return;
    const m = STATION_MUSIC[station];
    const bar = Math.floor(musicStep / 8) % 4;
    const beat = musicStep % 8;
    if (beat === 0) { for (const f of m.chords[bar]) tone(f, 1.7, m.wave, 0.045); tone(m.bass[bar], 0.5, 'sawtooth', 0.08); }
    if (beat === 4) tone(m.bass[bar] * 1.5, 0.4, 'sawtooth', 0.05);
    if (beat % 2 === 1) noise(0.03, 0.025, 8000);
    musicStep += 1;
  }
  return {
    ensure,
    get muted() { return muted; },
    get station() { return RADIO_STATIONS[station]; },
    setMuted(value) { muted = value; if (master) master.gain.value = muted ? 0 : 0.5; },
    nextStation() {
      station = (station + 1) % RADIO_STATIONS.length;
      if (musicTimer) { window.clearInterval(musicTimer); musicTimer = window.setInterval(musicTick, RADIO_STATIONS[station].tempo); }
      return RADIO_STATIONS[station].name;
    },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicTimer = window.setInterval(musicTick, RADIO_STATIONS[station].tempo);
    },
    stopMusic() { if (musicTimer) { window.clearInterval(musicTimer); musicTimer = null; } },
    engine(speedRatio, on) {
      if (!ensure()) return;
      if (!on) { if (engineOsc) { try { engineOsc.stop(); } catch { /* already stopped */ } engineOsc = null; } return; }
      if (!engineOsc) {
        engineOsc = ctx.createOscillator(); engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth'; engineGain.gain.value = 0.04;
        const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 900;
        engineOsc.connect(filter).connect(engineGain).connect(master); engineOsc.start();
      }
      engineOsc.frequency.setValueAtTime(70 + speedRatio * 160, ctx.currentTime);
      engineGain.gain.setValueAtTime(0.02 + speedRatio * 0.05, ctx.currentTime);
    },
    siren(on) {
      if (!ensure()) return;
      if (!on) { if (sirenOsc) { try { sirenOsc.stop(); } catch { /* already stopped */ } sirenOsc = null; } return; }
      if (!sirenOsc) {
        sirenOsc = ctx.createOscillator(); sirenGain = ctx.createGain();
        sirenOsc.type = 'sine'; sirenGain.gain.value = 0.035;
        sirenOsc.connect(sirenGain).connect(master); sirenOsc.start();
      }
      sirenOsc.frequency.setValueAtTime(Date.now() % 1000 < 500 ? 720 : 980, ctx.currentTime);
    },
    blip() { tone(880, 0.12, 'sine', 0.12, 1320); },
    cash() { tone(660, 0.1, 'square', 0.08); window.setTimeout(() => tone(990, 0.14, 'square', 0.08), 90); },
    thud() { noise(0.12, 0.2, 500); tone(120, 0.12, 'sine', 0.2, 60); },
    shot() { noise(0.16, 0.3, 2400); tone(180, 0.1, 'square', 0.12, 70); },
    crash() { noise(0.4, 0.35, 900); tone(90, 0.35, 'sawtooth', 0.15, 40); },
    horn() { tone(370, 0.25, 'square', 0.1); tone(466, 0.25, 'square', 0.08); },
    jingle() { [523, 659, 784, 1047].forEach((f, i) => window.setTimeout(() => tone(f, 0.22, 'triangle', 0.12), i * 110)); },
    busted() { [392, 330, 262].forEach((f, i) => window.setTimeout(() => tone(f, 0.3, 'sawtooth', 0.1), i * 160)); },
    click() { tone(1200, 0.05, 'sine', 0.08); },
  };
}
