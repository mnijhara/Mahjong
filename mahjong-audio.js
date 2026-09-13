(() => {
  'use strict';

  let ctx = null;
  let muted = false;

  try {
    muted = localStorage.getItem('mahjong-sound-muted') === 'true';
  } catch (e) {}

  function getContext() {
    if (!ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) ctx = new AudioContextClass();
    }
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  // Create a brief noise buffer for impact transients and felt friction
  let noiseBuffer = null;
  function getNoiseBuffer(context) {
    if (noiseBuffer) return noiseBuffer;
    const size = context.sampleRate * 0.5;
    noiseBuffer = context.createBuffer(1, size, context.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  // Subtle tactile haptic pulse on modern touch devices
  function triggerHaptic(type = 'light') {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (type === 'light') navigator.vibrate(8);
        else if (type === 'medium') navigator.vibrate(16);
        else if (type === 'heavy') navigator.vibrate([12, 40, 20]);
      } catch (e) {}
    }
  }

  // Realistic heavy tile click (urea resin / bone collision)
  function playClick(options = {}) {
    triggerHaptic('light');
    if (muted) return;
    const ac = getContext();
    if (!ac) return;

    const t = ac.currentTime;
    const master = ac.createGain();
    master.gain.value = options.volume ?? 0.28;
    master.connect(ac.destination);

    // Randomized physical pitch variation
    const pitchJitter = 0.92 + Math.random() * 0.16;

    // Transient 1: Sharp ceramic slap
    const noise = ac.createBufferSource();
    noise.buffer = getNoiseBuffer(ac);
    const noiseFilter = ac.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = (3200 + Math.random() * 800) * pitchJitter;
    noiseFilter.Q.value = 3.5;

    const noiseGain = ac.createGain();
    noiseGain.gain.setValueAtTime(0.7, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.025);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(t);
    noise.stop(t + 0.03);

    // Transient 2: High resonant body ping (bone/resin harmonic)
    const oscHigh = ac.createOscillator();
    const gainHigh = ac.createGain();
    oscHigh.type = 'sine';
    oscHigh.frequency.setValueAtTime((2450 + Math.random() * 200) * pitchJitter, t);
    oscHigh.frequency.exponentialRampToValueAtTime(1800 * pitchJitter, t + 0.05);

    gainHigh.gain.setValueAtTime(0.45, t);
    gainHigh.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    oscHigh.connect(gainHigh);
    gainHigh.connect(master);
    oscHigh.start(t);
    oscHigh.stop(t + 0.055);

    // Body 3: Table felt thump / lower weight
    const oscLow = ac.createOscillator();
    const gainLow = ac.createGain();
    oscLow.type = 'triangle';
    oscLow.frequency.setValueAtTime((420 + Math.random() * 60) * pitchJitter, t);
    oscLow.frequency.exponentialRampToValueAtTime(140, t + 0.04);

    gainLow.gain.setValueAtTime(0.5, t);
    gainLow.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    oscLow.connect(gainLow);
    gainLow.connect(master);
    oscLow.start(t);
    oscLow.stop(t + 0.045);
  }

  // Felt slide sound (moving tile across baize tabletop)
  function playSlide() {
    if (muted) return;
    const ac = getContext();
    if (!ac) return;

    const t = ac.currentTime;
    const noise = ac.createBufferSource();
    noise.buffer = getNoiseBuffer(ac);

    const filter = ac.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, t);
    filter.frequency.linearRampToValueAtTime(1200, t + 0.08);
    filter.Q.value = 1.8;

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ac.destination);

    noise.start(t);
    noise.stop(t + 0.13);
  }

  // Harmonic bell chime on Chi, Pon, Kan, or valid match (with combo pitch scaling)
  function playChime(success = true, comboTier = 1) {
    triggerHaptic(success ? 'medium' : 'light');
    if (muted) return;
    const ac = getContext();
    if (!ac) return;

    const t = ac.currentTime;
    const master = ac.createGain();
    master.gain.value = 0.22;
    master.connect(ac.destination);

    // Scale frequencies with combo tier: 1.0 (base), 1.122, 1.259, 1.414, 1.587
    const multipliers = [1.0, 1.0, 1.122, 1.259, 1.414, 1.587];
    const mult = multipliers[Math.min(comboTier, 5)] || 1.0;

    const freqs = success ? [587.33 * mult, 880.0 * mult, 1174.66 * mult] : [330.0, 293.66]; // D5, A5, D6 vs decline
    freqs.forEach((freq, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const offset = t + (idx * 0.04);
      gain.gain.setValueAtTime(0.001, offset);
      gain.gain.linearRampToValueAtTime(0.35, offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, offset + 0.35);

      osc.connect(gain);
      gain.connect(master);
      osc.start(offset);
      osc.stop(offset + 0.36);
    });
  }

  // Victory fanfare (rich ascending pentatonic progression)
  function playWin() {
    triggerHaptic('heavy');
    if (muted) return;
    const ac = getContext();
    if (!ac) return;

    const t = ac.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = i === notes.length - 1 ? 'triangle' : 'sine';
      osc.frequency.value = freq;

      const start = t + i * 0.08;
      const dur = i === notes.length - 1 ? 0.9 : 0.45;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.28, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(start);
      osc.stop(start + dur + 0.05);
    });
  }

  function setMuted(val) {
    muted = Boolean(val);
    try {
      localStorage.setItem('mahjong-sound-muted', String(muted));
    } catch (e) {}
    updateSoundButton();
  }

  function toggleSound() {
    setMuted(!muted);
    if (!muted) playClick();
    return !muted;
  }

  function updateSoundButton() {
    const btn = document.getElementById('soundBtn');
    if (btn) {
      btn.textContent = muted ? '🔇' : '🔊';
      btn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
      btn.title = muted ? 'Unmute sound' : 'Mute sound';
    }
  }

  // Sync with user gestures early so audio context unlocks smoothly
  document.addEventListener('click', () => {
    if (!ctx) getContext();
  }, { once: true });

  window.mahjongAudio = {
    playClick,
    playSlide,
    playChime,
    playWin,
    triggerHaptic,
    toggleSound,
    setMuted,
    isMuted: () => muted
  };

  window.addEventListener('DOMContentLoaded', updateSoundButton);
})();
