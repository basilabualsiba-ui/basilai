// Sound Service for UI feedback sounds
// Uses Web Audio API for low-latency playback

type SoundType = 'click' | 'success' | 'error' | 'toggle' | 'complete' | 'notification' | 'pop' | 'swoosh';

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  attack?: number;
  decay?: number;
}

const soundConfigs: Record<SoundType, SoundConfig> = {
  click: { frequency: 800, duration: 0.05, type: 'sine', volume: 0.1, attack: 0.001, decay: 0.04 },
  success: { frequency: 880, duration: 0.15, type: 'sine', volume: 0.12, attack: 0.01, decay: 0.1 },
  error: { frequency: 280, duration: 0.2, type: 'sawtooth', volume: 0.08, attack: 0.01, decay: 0.15 },
  toggle: { frequency: 600, duration: 0.08, type: 'sine', volume: 0.08, attack: 0.001, decay: 0.06 },
  complete: { frequency: 1047, duration: 0.25, type: 'sine', volume: 0.15, attack: 0.01, decay: 0.2 },
  notification: { frequency: 523, duration: 0.12, type: 'sine', volume: 0.1, attack: 0.01, decay: 0.08 },
  pop: { frequency: 400, duration: 0.06, type: 'sine', volume: 0.1, attack: 0.001, decay: 0.05 },
  swoosh: { frequency: 200, duration: 0.15, type: 'sine', volume: 0.06, attack: 0.01, decay: 0.12 },
};

class SoundService {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  private getContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('soundEnabled', String(enabled));
  }

  isEnabled(): boolean {
    const stored = localStorage.getItem('soundEnabled');
    if (stored !== null) {
      this.enabled = stored === 'true';
    }
    return this.enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundVolume', String(this.volume));
  }

  getVolume(): number {
    const stored = localStorage.getItem('soundVolume');
    if (stored !== null) {
      this.volume = parseFloat(stored);
    }
    return this.volume;
  }

  play(soundType: SoundType) {
    if (!this.isEnabled()) return;

    try {
      const ctx = this.getContext();
      const config = soundConfigs[soundType];
      
      // Create oscillator
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, ctx.currentTime);
      
      // Apply volume envelope
      const volume = config.volume * this.getVolume();
      const attack = config.attack || 0.01;
      const decay = config.decay || config.duration;
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + config.duration);
      
      // Connect and play
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + config.duration);

      // Special handling for compound sounds
      if (soundType === 'success') {
        // Play a second note for success (chord)
        setTimeout(() => this.playNote(1174, 0.1, 'sine', volume * 0.8), 50);
      } else if (soundType === 'complete') {
        // Play ascending notes for completion
        setTimeout(() => this.playNote(1319, 0.15, 'sine', volume * 0.9), 80);
        setTimeout(() => this.playNote(1568, 0.2, 'sine', volume * 0.7), 160);
      }
    } catch (e) {
      console.warn('Sound playback failed:', e);
    }
  }

  private playNote(frequency: number, duration: number, type: OscillatorType, volume: number) {
    if (!this.isEnabled()) return;
    
    try {
      const ctx = this.getContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      // Silently fail
    }
  }

  // Convenience methods
  click() { this.play('click'); }
  success() { this.play('success'); }
  error() { this.play('error'); }
  toggle() { this.play('toggle'); }
  complete() { this.play('complete'); }
  notification() { this.play('notification'); }
  pop() { this.play('pop'); }
  swoosh() { this.play('swoosh'); }
}

export const soundService = new SoundService();
