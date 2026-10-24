// Web Audio & Real Audio engine for background concentration & sound masking
// 100% offline, zero external requests, real natural audio + studio synthesis

export type FocusSoundType = 'brown' | 'rain' | 'alpha' | 'pink';

export interface FocusSoundInfo {
  id: FocusSoundType;
  name: string;
  tagline: string;
  description: string;
  color: string;
}

export const FOCUS_SOUND_OPTIONS: FocusSoundInfo[] = [
  {
    id: 'rain',
    name: 'Natural Rain & Drops',
    tagline: 'Real recorded soothing rain',
    description: 'Authentic natural rainfall audio featuring organic water drops, soft atmospheric breeze, and zero fatigue.',
    color: '#38BDF8',
  },
  {
    id: 'brown',
    name: 'Deep Brown Noise',
    tagline: 'Maximum acoustic isolation',
    description: 'Heavy, warm low-frequency roar designed to completely mask voices, distant traffic, and ambient distractions.',
    color: '#D97706',
  },
  {
    id: 'alpha',
    name: 'Alpha Focus Drone',
    tagline: '10Hz binaural focus wave',
    description: 'Warm analog drone tuned to 10Hz alpha difference to induce calm, sustained deep work and coding flow.',
    color: '#A855F7',
  },
  {
    id: 'pink',
    name: 'Smooth Pink Noise',
    tagline: 'Balanced wide-spectrum focus',
    description: 'Gentle 1/f noise curve with rolled-off highs, creating a steady, restful acoustic blanket for reading and writing.',
    color: '#EC4899',
  },
];

class FocusAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private currentType: FocusSoundType | null = null;
  private activeNodes: { disconnect: () => void; stop?: () => void }[] = [];
  private volume: number = 0.6;
  private isPlaying: boolean = false;

  // Real natural rain audio player
  private rainAudio: HTMLAudioElement | null = null;
  private rainFadeInterval: ReturnType<typeof setInterval> | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getRainAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;
    if (!this.rainAudio) {
      const audioUrl = new URL('audio/rain.mp3', window.location.href).href;
      this.rainAudio = new Audio(audioUrl);
      this.rainAudio.loop = true;
      this.rainAudio.preload = 'auto';
    }
    return this.rainAudio;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getCurrentType(): FocusSoundType | null {
    return this.currentType;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    const clamped = Math.max(0, Math.min(1, vol));
    this.volume = clamped;

    // Update real rain audio volume
    if (this.rainAudio && this.currentType === 'rain' && this.isPlaying) {
      this.rainAudio.volume = clamped;
    }

    // Update Web Audio master gain
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(clamped, now + 0.05);
    }
  }

  public play(type: FocusSoundType, targetVolume?: number): void {
    if (targetVolume !== undefined) {
      this.volume = Math.max(0, Math.min(1, targetVolume));
    }

    if (this.isPlaying && this.currentType === type) {
      this.setVolume(this.volume);
      return;
    }

    this.stopActiveNodes();
    this.stopRainAudio();

    this.currentType = type;
    this.isPlaying = true;

    if (type === 'rain') {
      this.playRealRain();
      return;
    }

    const ctx = this.getContext();
    if (!ctx) return;

    const master = ctx.createGain();
    const now = ctx.currentTime;
    master.gain.setValueAtTime(0.001, now);
    master.gain.linearRampToValueAtTime(this.volume, now + 0.35);
    master.connect(ctx.destination);
    this.masterGain = master;

    switch (type) {
      case 'brown':
        this.setupBrownNoise(ctx, master);
        break;
      case 'alpha':
        this.setupAlphaDrone(ctx, master);
        break;
      case 'pink':
        this.setupPinkNoise(ctx, master);
        break;
    }
  }

  public stop(): void {
    this.isPlaying = false;
    this.currentType = null;

    this.stopRainAudio();

    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(0.0001, now + 0.2);
    }

    setTimeout(() => {
      this.stopActiveNodes();
    }, 220);
  }

  private playRealRain(): void {
    const audio = this.getRainAudio();
    if (!audio) return;

    if (this.rainFadeInterval) {
      clearInterval(this.rainFadeInterval);
      this.rainFadeInterval = null;
    }

    audio.volume = 0.01;
    audio.play().catch(() => {});

    // Smooth soft fade in
    const targetVol = this.volume;
    let currentVol = 0.01;
    this.rainFadeInterval = setInterval(() => {
      currentVol += 0.08;
      if (currentVol >= targetVol) {
        currentVol = targetVol;
        if (this.rainFadeInterval) {
          clearInterval(this.rainFadeInterval);
          this.rainFadeInterval = null;
        }
      }
      if (this.rainAudio) {
        this.rainAudio.volume = Math.max(0, Math.min(1, currentVol));
      }
    }, 30);
  }

  private stopRainAudio(): void {
    if (this.rainFadeInterval) {
      clearInterval(this.rainFadeInterval);
      this.rainFadeInterval = null;
    }

    if (!this.rainAudio) return;

    const audio = this.rainAudio;
    let currentVol = audio.volume;

    this.rainFadeInterval = setInterval(() => {
      currentVol -= 0.12;
      if (currentVol <= 0.01) {
        audio.pause();
        audio.currentTime = 0;
        if (this.rainFadeInterval) {
          clearInterval(this.rainFadeInterval);
          this.rainFadeInterval = null;
        }
      } else {
        audio.volume = Math.max(0, currentVol);
      }
    }, 25);
  }

  private stopActiveNodes(): void {
    for (const node of this.activeNodes) {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch {
        // Node already stopped
      }
    }
    this.activeNodes = [];
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch {
        // Ignore
      }
      this.masterGain = null;
    }
  }

  // --- Acoustic Synthesizers for Other Profiles ---

  /**
   * Deep Brown Noise:
   * Heavy 6dB/octave Brownian walk with warm low-pass at 290Hz and sub-bass shelf.
   * Completely masks external environmental noise without ear fatigue.
   */
  private setupBrownNoise(ctx: AudioContext, destination: AudioNode): void {
    const bufferSize = ctx.sampleRate * 6;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.016 * white) / 1.016;
        data[i] = lastOut * 4.2;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(290, ctx.currentTime);
    filter.Q.setValueAtTime(0.5, ctx.currentTime);

    const bass = ctx.createBiquadFilter();
    bass.type = 'lowshelf';
    bass.frequency.setValueAtTime(110, ctx.currentTime);
    bass.gain.setValueAtTime(4.5, ctx.currentTime);

    source.connect(filter);
    filter.connect(bass);
    bass.connect(destination);

    source.start();
    this.activeNodes.push(source, filter, bass);
  }

  /**
   * Alpha Focus Drone:
   * Warm musical synth drone with 10Hz binaural difference (108Hz + 118Hz)
   */
  private setupAlphaDrone(ctx: AudioContext, destination: AudioNode): void {
    const baseFreq = 108.0;
    const alphaDifference = 10.0;

    const oscLeft = ctx.createOscillator();
    oscLeft.type = 'sine';
    oscLeft.frequency.setValueAtTime(baseFreq, ctx.currentTime);

    const oscRight = ctx.createOscillator();
    oscRight.type = 'sine';
    oscRight.frequency.setValueAtTime(baseFreq + alphaDifference, ctx.currentTime);

    const oscSub = ctx.createOscillator();
    oscSub.type = 'sine';
    oscSub.frequency.setValueAtTime(baseFreq / 2, ctx.currentTime);

    const oscWarmth = ctx.createOscillator();
    oscWarmth.type = 'triangle';
    oscWarmth.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);

    const panLeft = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const panRight = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

    if (panLeft) panLeft.pan.setValueAtTime(-0.75, ctx.currentTime);
    if (panRight) panRight.pan.setValueAtTime(0.75, ctx.currentTime);

    const droneMix = ctx.createGain();
    droneMix.gain.setValueAtTime(0.32, ctx.currentTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(260, ctx.currentTime);
    filter.Q.setValueAtTime(0.9, ctx.currentTime);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.35, ctx.currentTime);
    oscSub.connect(subGain);
    subGain.connect(droneMix);

    const warmthGain = ctx.createGain();
    warmthGain.gain.setValueAtTime(0.06, ctx.currentTime);
    oscWarmth.connect(warmthGain);
    warmthGain.connect(droneMix);

    if (panLeft && panRight) {
      oscLeft.connect(panLeft);
      panLeft.connect(droneMix);
      oscRight.connect(panRight);
      panRight.connect(droneMix);
    } else {
      oscLeft.connect(droneMix);
      oscRight.connect(droneMix);
    }

    droneMix.connect(filter);
    filter.connect(destination);

    oscLeft.start();
    oscRight.start();
    oscSub.start();
    oscWarmth.start();

    this.activeNodes.push(
      oscLeft,
      oscRight,
      oscSub,
      oscWarmth,
      droneMix,
      filter,
      subGain,
      warmthGain
    );
    if (panLeft) this.activeNodes.push(panLeft);
    if (panRight) this.activeNodes.push(panRight);
  }

  /**
   * Smooth Pink Noise:
   * Balanced 1/f noise curve with high-frequency rolloff at 1800Hz.
   */
  private setupPinkNoise(ctx: AudioContext, destination: AudioNode): void {
    const bufferSize = ctx.sampleRate * 6;
    const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.969 * b2 + white * 0.153852;
        b3 = 0.8665 * b3 + white * 0.3104856;
        b4 = 0.55 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + white * 0.15) * 0.08;
      }
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, ctx.currentTime);

    source.connect(filter);
    filter.connect(destination);

    source.start();
    this.activeNodes.push(source, filter);
  }
}

export const focusAudio = new FocusAudioEngine();
