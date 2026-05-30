/** Tiny WebAudio sound engine. All effects are synthesized — no audio files.
 *  The AudioContext is created lazily on the first user gesture to satisfy
 *  browser autoplay policies (see `unlock`). */
class AudioEngine {
  muted = false;
  private ctx: AudioContext | null = null;
  private marchStep = 0;

  /** Create/resume the context. Call from a user-gesture handler. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    }
    void this.ctx?.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private tone(freq: number, duration: number, type: OscillatorType, gain = 0.08): void {
    if (this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(env).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  /** A short downward sweep, used for explosions. */
  private sweep(from: number, to: number, duration: number, gain = 0.1): void {
    if (this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + duration);
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(env).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  shoot(): void {
    this.tone(880, 0.12, 'square', 0.05);
  }

  alienDeath(): void {
    this.sweep(420, 120, 0.18, 0.09);
  }

  playerDeath(): void {
    this.sweep(300, 40, 0.7, 0.13);
  }

  ufo(): void {
    this.tone(1200, 0.25, 'sine', 0.05);
  }

  ufoHit(): void {
    this.sweep(900, 200, 0.3, 0.1);
  }

  /** The classic four-note descending march loop; advance one step per call. */
  marchTick(): void {
    const notes = [110, 98, 87, 82];
    this.tone(notes[this.marchStep % notes.length], 0.08, 'square', 0.06);
    this.marchStep++;
  }
}

export const audio = new AudioEngine();
