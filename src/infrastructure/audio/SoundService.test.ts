import { describe, it, expect, vi } from 'vitest';
import { SoundService } from './SoundService';

describe('SoundService', () => {
  it('should not throw when Web Audio API or navigator is unavailable', () => {
    expect(() => SoundService.playBarcodeBeep()).not.toThrow();
    expect(() => SoundService.playSuccessTone()).not.toThrow();
  });

  it('should trigger navigator.vibrate if available', () => {
    const vibrateSpy = vi.fn();
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: vibrateSpy },
      configurable: true,
      writable: true,
    });

    SoundService.playBarcodeBeep();
    expect(vibrateSpy).toHaveBeenCalledWith(60);

    SoundService.playSuccessTone();
    expect(vibrateSpy).toHaveBeenCalledWith([40, 30, 40]);
  });
});
