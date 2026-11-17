// Synthesized sound: no audio files, everything is WebAudio oscillators —
// three radio stations, engine hum, crashes, cash and jingles.
import { STATIONS } from './tuning.js';

const SCALES = {
  wave: [220, 261.6, 329.6, 392, 440, 523.3],
  salsa: [196, 246.9, 293.7, 329.6, 392, 440],
  rock: [164.8, 196, 246.9, 293.7, 329.6, 392],
};
export function makeSynth() {
  const synth = {
    ctx: null, muted: false, station: 0, musicTimer: 0, noteStep: 0,
    engineOsc: null, engineGain: null, engineOn: false,
  };
  function ac() {
    if (!synth.ctx) {
      try { synth.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { synth.ctx = null; }
    }
    if (synth.ctx && synth.ctx.state === 'suspended') synth.ctx.resume();
    return synth.ctx;
  }
  function tone(freq, dur, type, vol, when = 0) {
    const ctx = ac();
    if (!ctx || synth.muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  synth.ensure = () => { ac(); };
  synth.setMuted = (m) => { synth.muted = m; if (m) synth.engine(0, false); };
  synth.click = () => tone(660, 0.07, 'square', 0.08);
  synth.blip = () => { tone(520, 0.09, 'sine', 0.1); tone(780, 0.09, 'sine', 0.08, 0.07); };
  synth.cash = () => { tone(880, 0.1, 'sine', 0.1); tone(1318, 0.16, 'sine', 0.1, 0.08); };
  synth.jingle = () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.16, 'triangle', 0.11, i * 0.09)); };
  synth.crash = () => { tone(90, 0.3, 'sawtooth', 0.16); tone(55, 0.35, 'square', 0.12, 0.03); };
  synth.shot = () => { tone(180, 0.09, 'square', 0.14); tone(70, 0.12, 'sawtooth', 0.1, 0.01); };
  synth.siren = () => { tone(700, 0.18, 'sine', 0.05); tone(950, 0.18, 'sine', 0.05, 0.18); };
  synth.nextStation = () => {
    synth.station = (synth.station + 1) % STATIONS.length;
    synth.noteStep = 0;
    return STATIONS[synth.station].name;
  };
  synth.engine = (speed, on) => {
    const ctx = ac();
    if (!ctx) return;
    if (!on) {
      if (synth.engineOsc) { try { synth.engineOsc.stop(); } catch (e) { /* already stopped */ } synth.engineOsc = null; synth.engineGain = null; }
      synth.engineOn = false; return;
    }
    if (!synth.engineOsc) {
      synth.engineOsc = ctx.createOscillator();
      synth.engineGain = ctx.createGain();
      synth.engineOsc.type = 'sawtooth';
      synth.engineGain.gain.value = 0.02;
      synth.engineOsc.connect(synth.engineGain);
      synth.engineGain.connect(ctx.destination);
      synth.engineOsc.start();
      synth.engineOn = true;
    }
    synth.engineOsc.frequency.setValueAtTime(50 + Math.abs(speed) * 0.09, ctx.currentTime);
    synth.engineGain.gain.setValueAtTime(synth.muted ? 0 : 0.015 + Math.abs(speed) * 0.00003, ctx.currentTime);
  };
  // A slow sequencer: one note every beat, bass underneath, per station.
  synth.music = (dt) => {
    const ctx = ac();
    if (!ctx || synth.muted) return;
    synth.musicTimer -= dt;
    if (synth.musicTimer > 0) return;
    const station = STATIONS[synth.station];
    synth.musicTimer = 60 / station.bpm / 2;
    const scale = SCALES[station.id];
    const step = synth.noteStep;
    synth.noteStep += 1;
    const melody = [0, 2, 1, 3, 2, 4, 3, 5, 4, 2, 1, 0];
    const note = scale[melody[step % melody.length] % scale.length];
    tone(note * 2, 0.22, station.id === 'rock' ? 'square' : 'triangle', 0.045);
    if (step % 4 === 0) tone(scale[0] / 2, 0.4, 'sine', 0.07);
    if (station.id === 'salsa' && step % 2 === 1) tone(1200, 0.05, 'square', 0.02);
  };
  return synth;
}
