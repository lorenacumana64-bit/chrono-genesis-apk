const ERA_CHORDS = [
  [130.81, 196.0, 233.08, 293.66],
  [146.83, 220.0, 277.18, 329.63],
  [164.81, 246.94, 293.66, 369.99]
];

export class ChronoAudio {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.padFilter = null;
    this.padVoices = [];
    this.lfo = null;
    this.era = 0;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.hapticEnabled = true;
    this.tapIndex = 0;
    this.initialized = false;
  }

  unlock() {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.75;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicEnabled ? 0.14 : 0.0;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxEnabled ? 0.48 : 0.0;
      this.sfxGain.connect(this.masterGain);

      this._startAmbientPad();
      this.initialized = true;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  _startAmbientPad() {
    if (!this.ctx) return;
    this.padFilter = this.ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 520;
    this.padFilter.Q.value = 1.4;
    this.padFilter.connect(this.musicGain);

    this.lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.11;
    lfoGain.gain.value = 210;
    this.lfo.connect(lfoGain);
    lfoGain.connect(this.padFilter.frequency);
    this.lfo.start();

    const chord = ERA_CHORDS[this.era] || ERA_CHORDS[0];
    this.padVoices = chord.map((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const vGain = this.ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      vGain.gain.value = idx === 0 ? 0.34 : 0.22;
      osc.connect(vGain);
      vGain.connect(this.padFilter);
      osc.start();
      return osc;
    });
  }

  setEra(eraIndex) {
    this.era = Math.max(0, Math.min(2, eraIndex));
    if (!this.ctx || !this.padVoices.length) return;
    const now = this.ctx.currentTime;
    const chord = ERA_CHORDS[this.era];
    this.padVoices.forEach((osc, idx) => {
      osc.frequency.cancelScheduledValues(now);
      osc.frequency.setValueAtTime(osc.frequency.value, now);
      osc.frequency.linearRampToValueAtTime(chord[idx], now + 1.8);
    });
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = Boolean(enabled);
    if (this.ctx && this.musicGain) {
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(this.musicEnabled ? 0.14 : 0.0, now + 0.2);
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = Boolean(enabled);
    if (this.ctx && this.sfxGain) {
      this.sfxGain.gain.value = this.sfxEnabled ? 0.48 : 0.0;
    }
  }

  setHapticEnabled(enabled) {
    this.hapticEnabled = Boolean(enabled);
  }

  haptic(ms = 12) {
    if (!this.hapticEnabled) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  }

  playTap() {
    this.unlock();
    this.haptic(10);
    if (!this.ctx || !this.sfxEnabled) return;

    const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
    const base = pentatonic[this.tapIndex % pentatonic.length] * (1 + this.era * 0.06);
    this.tapIndex++;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.18, now + 0.11);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.22);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.24);
  }

  playBuy() {
    this.unlock();
    this.haptic(16);
    if (!this.ctx || !this.sfxEnabled) return;
    this._playNotes([523.25, 659.25, 783.99], 0.05, 0.18, 'triangle', 0.22);
  }

  playUpgrade() {
    this.unlock();
    this.haptic(22);
    if (!this.ctx || !this.sfxEnabled) return;
    this._playNotes([587.33, 739.99, 880.0, 1174.66], 0.055, 0.24, 'sine', 0.24);
  }

  playEraUnlock() {
    this.unlock();
    this.haptic([25, 35, 45]);
    if (!this.ctx || !this.sfxEnabled) return;
    const chord = ERA_CHORDS[this.era] || ERA_CHORDS[0];
    this._playNotes(chord.map((n) => n * 2), 0.09, 0.75, 'sine', 0.28);
  }

  playPrestige() {
    this.unlock();
    this.haptic([40, 40, 70]);
    if (!this.ctx || !this.sfxEnabled) return;
    this._playNotes([261.63, 392.0, 523.25, 783.99, 1046.5, 1567.98], 0.075, 0.8, 'triangle', 0.26);
  }

  _playNotes(freqs, stepSec, durSec, type, peak) {
    const now = this.ctx.currentTime;
    freqs.forEach((f, idx) => {
      const start = now + idx * stepSec;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(f, start);
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0008, start + durSec);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(start);
      osc.stop(start + durSec + 0.02);
    });
  }
}
