let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.3) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

export function playClick() {
  playTone(800, 0.08, 'square', 0.15);
}

export function playDiceRoll() {
  const ctx = getCtx();
  const duration = 0.35;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(2000, ctx.currentTime);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function playDiceResult() {
  playTone(523, 0.1, 'sine', 0.25);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.25), 80);
}

export function playTokenMove() {
  playTone(440, 0.06, 'triangle', 0.2);
  setTimeout(() => playTone(550, 0.06, 'triangle', 0.15), 50);
}

export function playTokenEnter() {
  playTone(392, 0.1, 'sine', 0.3);
  setTimeout(() => playTone(523, 0.1, 'sine', 0.3), 100);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.3), 200);
}

export function playCapture() {
  playTone(200, 0.15, 'sawtooth', 0.25);
  setTimeout(() => playTone(150, 0.2, 'sawtooth', 0.2), 100);
  setTimeout(() => playTone(300, 0.1, 'square', 0.15), 250);
}

export function playFinish() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.2, 'sine', 0.25), i * 120);
  });
}

export function playWin() {
  const melody = [523, 659, 784, 659, 784, 1047];
  melody.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.25, 'sine', 0.3), i * 150);
  });
}

export function playTurnStart() {
  playTone(880, 0.08, 'sine', 0.15);
}

export function playError() {
  playTone(200, 0.15, 'square', 0.15);
  setTimeout(() => playTone(160, 0.2, 'square', 0.12), 120);
}

export function playExtraTurn() {
  playTone(600, 0.08, 'triangle', 0.2);
  setTimeout(() => playTone(800, 0.08, 'triangle', 0.2), 80);
  setTimeout(() => playTone(1000, 0.12, 'triangle', 0.2), 160);
}

export function playSix() {
  playTone(700, 0.1, 'sine', 0.3);
  setTimeout(() => playTone(900, 0.1, 'sine', 0.3), 100);
  setTimeout(() => playTone(1100, 0.15, 'sine', 0.3), 200);
}
