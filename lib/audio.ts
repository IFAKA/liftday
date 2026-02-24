// Sound engine — Web Audio API cues + haptic feedback
// Uses a single shared AudioContext, unlocked on first user gesture

let sharedCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (!sharedCtx) {
      sharedCtx = new AudioContext();
    }
    if (sharedCtx.state === 'suspended') {
      sharedCtx.resume();
    }
    return sharedCtx;
  } catch {
    return null;
  }
}

/** Call on first user tap to unlock audio for the session */
export function unlockAudio() {
  const ctx = getContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
}

function playTone(
  frequency: number,
  duration: number,
  volume = 0.3,
  startDelay = 0,
  waveform: OscillatorType = 'sine'
): void {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = waveform;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime + startDelay);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + startDelay + duration
    );
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + duration + 0.05);
  } catch {
    // Audio not available
  }
}

function playWarmNote(
  ctx: AudioContext,
  frequency: number,
  startTime: number,
  duration: number,
  volume: number,
  waveform: OscillatorType = 'sine'
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = waveform;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.05);
}

export function playTargetHit() {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 520;
    gain1.gain.setValueAtTime(0.25, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 780;
    gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.25);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.type = 'triangle';
    osc3.frequency.value = 780;
    gain3.gain.setValueAtTime(0.06, ctx.currentTime + 0.2);
    gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc3.start(ctx.currentTime + 0.2);
    osc3.stop(ctx.currentTime + 0.45);
  } catch {
    // Audio not available
  }
  vibrate([50]);
}

export function playTargetMiss() {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.value = 520;
    gain1.gain.setValueAtTime(0.22, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.value = 350;
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.27);

    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.type = 'triangle';
    osc3.frequency.value = 350;
    gain3.gain.setValueAtTime(0.05, ctx.currentTime + 0.22);
    gain3.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc3.start(ctx.currentTime + 0.22);
    osc3.stop(ctx.currentTime + 0.45);
  } catch {
    // Audio not available
  }
  vibrate([30, 30, 30]);
}

export function playSetLogged(hitTarget: boolean) {
  if (hitTarget) {
    playTargetHit();
  } else {
    playTargetMiss();
  }
}

export function playCountdownTick(secondsLeft: number) {
  const freqMap: Record<number, number> = { 3: 660, 2: 770, 1: 880 };
  const freq = freqMap[secondsLeft];
  if (!freq) return;
  playTone(freq, 0.08, 0.18, 0, 'triangle');
  vibrate([40]);
}

export function playRestComplete() {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const notes = [660, 880, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.35, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  } catch {
    // Audio not available
  }
  vibrate([60, 40, 100]);
}

export function playSessionComplete() {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  const ctx = getContext();
  if (!ctx) return;
  try {
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.connect(thumpGain);
    thumpGain.connect(ctx.destination);
    thump.type = 'sine';
    thump.frequency.setValueAtTime(120, ctx.currentTime);
    thump.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
    thumpGain.gain.setValueAtTime(0.30, ctx.currentTime);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    thump.start(ctx.currentTime);
    thump.stop(ctx.currentTime + 0.12);

    notes.forEach((freq, i) => {
      const start = ctx.currentTime + 0.1 + i * 0.12;
      playWarmNote(ctx, freq, start, 0.15, 0.35);
    });
  } catch {
    // Audio not available
  }
  vibrate([100, 50, 100, 50, 200]);
}

export function playStart() {
  playTone(523, 0.1, 0.25);
  playTone(784, 0.12, 0.25, 0.1);
  vibrate([40, 30, 40]);
}

export function playNextExercise() {
  playTone(660, 0.07, 0.22, 0, 'triangle');
  playTone(1047, 0.09, 0.22, 0.07, 'triangle');
  vibrate([60]);
}

export function playSkip() {
  playTone(500, 0.08, 0.18, 0, 'triangle');
  playTone(380, 0.06, 0.15, 0.06, 'triangle');
  vibrate([30]);
}

export function playBreakStart() {
  playTone(660, 0.1, 0.25);
  playTone(880, 0.1, 0.25, 0.12);
  vibrate([100, 50, 100]);
}

export function playWentOffline() {
  playTone(440, 0.12, 0.15, 0, 'triangle');
  playTone(330, 0.10, 0.12, 0.10, 'triangle');
}

export function playBackOnline() {
  playTone(440, 0.08, 0.15, 0, 'triangle');
  playTone(660, 0.10, 0.15, 0.08, 'triangle');
}

export function playBreakDone() {
  playTone(880, 0.1, 0.25);
  playTone(660, 0.1, 0.22, 0.12);
  vibrate([80, 40, 60]);
}

export function playMobilityComplete() {
  const ctx = getContext();
  if (!ctx) return;
  try {
    const notes = [784, 659, 523]; // G5, E5, C5
    notes.forEach((freq, i) => {
      const start = ctx.currentTime + i * 0.18;
      playWarmNote(ctx, freq, start, 0.18, 0.22);
    });
  } catch {
    // Audio not available
  }
  vibrate([80, 40, 80]);
}

export function playExerciseReady() {
  playTone(660, 0.06, 0.15, 0, 'sine');
}

export function playUndo() {
  playTone(440, 0.10, 0.20);
  playTone(330, 0.12, 0.18, 0.09);
  vibrate([30]);
}

function vibrate(pattern: number[]) {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Vibration not available
  }
}
