// All sound is synthesized with WebAudio — no asset files, works offline.

let ac: AudioContext | null = null;
let out: AudioNode | null = null; // master bus: boosted + compressed for phone speakers

export function ensureAudio(): AudioContext | null {
  if (!ac) {
    try {
      ac = new AudioContext();
      // iOS: treat us as media playback so the mute switch doesn't silence us
      const nav = navigator as unknown as { audioSession?: { type: string } };
      if (nav.audioSession) nav.audioSession.type = 'playback';
      const master = ac.createGain();
      master.gain.value = 1.7;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 6;
      master.connect(comp).connect(ac.destination);
      out = master;
    } catch {
      ac = null;
    }
  }
  if (ac?.state === 'suspended') void ac.resume();
  return ac;
}

const bus = (a: AudioContext): AudioNode => out ?? a.destination;

function noiseBuf(a: AudioContext, dur: number): AudioBuffer {
  const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

// Pass: clean thwack.
export function sndThwack() {
  const a = ensureAudio();
  if (!a) return;
  const s = a.createBufferSource();
  s.buffer = noiseBuf(a, 0.09);
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 700;
  const g = a.createGain();
  g.gain.setValueAtTime(0.9, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.09);
  s.connect(f).connect(g).connect(bus(a));
  s.start();
}

// Offside: referee's pea whistle (square wave + fast tremolo).
export function sndWhistle() {
  const a = ensureAudio();
  if (!a) return;
  const o = a.createOscillator();
  o.type = 'square';
  o.frequency.value = 2350;
  const g = a.createGain();
  const lfo = a.createOscillator();
  lfo.frequency.value = 27;
  const lg = a.createGain();
  lg.gain.value = 0.12;
  lfo.connect(lg).connect(g.gain);
  const t = a.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.02);
  g.gain.setValueAtTime(0.22, t + 0.45);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  o.connect(g).connect(bus(a));
  o.start(t);
  lfo.start(t);
  o.stop(t + 0.65);
  lfo.stop(t + 0.65);
}

// Blocked: a dull thud as the pass is cut out.
export function sndBlock() {
  const a = ensureAudio();
  if (!a) return;
  const s = a.createBufferSource();
  s.buffer = noiseBuf(a, 0.14);
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 300;
  const g = a.createGain();
  g.gain.setValueAtTime(1.0, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.14);
  s.connect(f).connect(g).connect(bus(a));
  s.start();
}

// Onside: crowd swell + boot on ball.
export function sndCheer() {
  const a = ensureAudio();
  if (!a) return;
  const s = a.createBufferSource();
  s.buffer = noiseBuf(a, 1.3);
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 850;
  f.Q.value = 0.6;
  const g = a.createGain();
  const t = a.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.35, t + 0.18);
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
  s.connect(f).connect(g).connect(bus(a));
  s.start();
  setTimeout(sndThwack, 220);
}
