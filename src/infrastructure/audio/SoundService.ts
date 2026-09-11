/**
 * Audio and Haptic Feedback Service
 * Generates synthesized barcode scanner sounds via Web Audio API
 * without relying on external mp3 files or network assets.
 */
export class SoundService {
  private static audioCtx: AudioContext | null = null;

  private static getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

      if (AudioContextClass) {
        try {
          this.audioCtx = new AudioContextClass();
        } catch {
          this.audioCtx = null;
        }
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  /**
   * Plays the classic POS barcode scanner beep ("pip")
   * and triggers a quick haptic pulse on Android.
   */
  static playBarcodeBeep(): void {
    try {
      // 1. Haptic vibration feedback for mobile (Android)
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(60);
      }

      // 2. Synthesized classic scanner sound (~1850 Hz, 90ms)
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const duration = 0.09; // 90 milliseconds

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1850, now);

      // Smooth attack and release to eliminate audio clicks
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.3, now + 0.006);
      gain.gain.setValueAtTime(0.3, now + duration - 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('[SoundService] Audio playback warning:', e);
    }
  }

  /**
   * Dual-tone confirmation sound for completed transactions
   */
  static playSuccessTone(): void {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate([40, 30, 40]);
      }

      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.setValueAtTime(1320, now + 0.08); // E6

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc1.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.18);
    } catch {
      // Ignore
    }
  }
}
