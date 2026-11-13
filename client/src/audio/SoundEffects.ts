/**
 * SoundEffects.ts
 * ───────────────
 * Zero-dependency Procedural Retro Sci-Fi Audio Synthesizer via Web Audio API.
 * Authentic 8-bit / 16-bit sound design for NASA Deep Space Co-op:
 *   - Button clicks / UI blips
 *   - Role select chirp
 *   - Item pickup & drop
 *   - Station crafting / assembly
 *   - Terminal communication chirp
 *   - Countdown beeps & rocket launch thruster roar
 *   - Mission victory celebration fanfare
 *   - Mission error / warning buzzer
 */

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private rocketRoarNode: AudioBufferSourceNode | null = null;
  private rocketGainNode: GainNode | null = null;
  private spaceAmbienceNodes: {
    osc1: OscillatorNode;
    osc2: OscillatorNode;
    lfo: OscillatorNode;
    filter: BiquadFilterNode;
    gain: GainNode;
  } | null = null;

  private _getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (muted && this.rocketGainNode) {
      this.rocketGainNode.gain.value = 0;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /** Subtle crisp UI click / button press */
  public playClick(): void {
    if (this.isMuted) return;
    const ctx = this._getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  }

  /** Role select / authorization chirp */
  public playRoleSelect(): void {
    if (this.isMuted) return;
    const ctx = this._getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(660, now + 0.05);
    osc.frequency.setValueAtTime(880, now + 0.1);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.18);
  }

  /** Mechanical station interaction / component pickup */
  public playPickup(): void {
    if (this.isMuted) return;
    const ctx = this._getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.09);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + 0.09);
  }

  /** Assembly Bay module installed into spaceship */
  public playInstallModule(): void {
    if (this.isMuted) return;
    const ctx = this._getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = "square";
    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.setValueAtTime(880, now + 0.07);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(220, now);
    osc2.frequency.exponentialRampToValueAtTime(110, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(now + 0.16);
    osc2.stop(now + 0.16);
  }

  /** Countdown Tick (for 3, 2, 1) */
  public playCountdownTick(isGo: boolean = false): void {
    if (this.isMuted) return;
    const ctx = this._getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isGo ? "sawtooth" : "square";
    const freq = isGo ? 1200 : 800;
    osc.frequency.setValueAtTime(freq, now);
    if (isGo) {
      osc.frequency.exponentialRampToValueAtTime(1800, now + 0.25);
    }

    const duration = isGo ? 0.35 : 0.12;
    gain.gain.setValueAtTime(isGo ? 0.22 : 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(now + duration);
  }

  /** Continuous Rocket Thruster Roar with deep noise and low rumble */
  public startRocketLaunchRoar(durationSeconds: number = 5.5): void {
    if (this.isMuted) return;
    const ctx = this._getAudioContext();
    if (!ctx) return;

    this.stopRocketLaunchRoar();

    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    // Brown noise filter for deep volcanic rocket rumble
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;

    // Low pass filter
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(160, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(650, ctx.currentTime + 3.0);

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 1.2);
    gain.gain.setValueAtTime(0.3, now + durationSeconds - 0.8);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);

    noiseNode.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseNode.start(now);
    noiseNode.stop(now + durationSeconds);

    this.rocketRoarNode = noiseNode;
    this.rocketGainNode = gain;
  }

  public stopRocketLaunchRoar(): void {
    if (this.rocketRoarNode) {
      try {
        this.rocketRoarNode.stop();
        this.rocketRoarNode.disconnect();
      } catch (_) {}
      this.rocketRoarNode = null;
    }
  }

  /** Mission Victory Fanfare */
  public playVictoryFanfare(): void {
    if (this.isMuted) return;
    const ctx = this._getAudioContext();
    if (!ctx) return;

    const notes = [
      { f: 523.25, t: 0.00, d: 0.12 }, // C5
      { f: 659.25, t: 0.12, d: 0.12 }, // E5
      { f: 783.99, t: 0.24, d: 0.14 }, // G5
      { f: 1046.5, t: 0.38, d: 0.35 }, // C6
    ];

    const now = ctx.currentTime;
    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.f, now + n.t);

      gain.gain.setValueAtTime(0.18, now + n.t);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });
  }

  /** Warning / Alert buzzer */
  public playAlert(): void {
    if (this.isMuted) return;
    const ctx = this._getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(180, now + 0.1);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  }

  /** Procedural gentle deep space ambient drone hum */
  public startSpaceAmbience(targetVolume: number = 0.05): void {
    if (this.isMuted || this.spaceAmbienceNodes) return;
    const ctx = this._getAudioContext();
    if (!ctx) return;

    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const masterGain = ctx.createGain();

      // Deep, cosmic fundamental drone (55Hz / A1 and 82.4Hz / E2)
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(55, ctx.currentTime);

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(82.4, ctx.currentTime);

      // Slow 0.12Hz LFO for gentle celestial breathing effect
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime);
      lfoGain.gain.setValueAtTime(15, ctx.currentTime);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      // Lowpass filter to keep it warm, deep and unobtrusive
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(160, ctx.currentTime);
      filter.Q.setValueAtTime(2, ctx.currentTime);

      // Smooth volume fade in
      masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(targetVolume, ctx.currentTime + 1.5);

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(ctx.destination);

      osc1.start();
      osc2.start();
      lfo.start();

      this.spaceAmbienceNodes = { osc1, osc2, lfo, filter, gain: masterGain };
    } catch (e) {
      console.warn("Could not start space ambience:", e);
    }
  }

  public stopSpaceAmbience(): void {
    if (!this.spaceAmbienceNodes) return;
    const ctx = this._getAudioContext();
    const nodes = this.spaceAmbienceNodes;
    this.spaceAmbienceNodes = null;

    if (ctx && nodes.gain) {
      try {
        nodes.gain.gain.setValueAtTime(nodes.gain.gain.value, ctx.currentTime);
        nodes.gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
        setTimeout(() => {
          try {
            nodes.osc1.stop();
            nodes.osc2.stop();
            nodes.lfo.stop();
            nodes.osc1.disconnect();
            nodes.osc2.disconnect();
            nodes.lfo.disconnect();
            nodes.filter.disconnect();
            nodes.gain.disconnect();
          } catch (_) {}
        }, 900);
      } catch (_) {}
    }
  }
}

export const SoundFX = new SoundManager();
