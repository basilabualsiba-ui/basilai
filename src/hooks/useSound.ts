import { useCallback } from 'react';
import { soundService } from '@/services/SoundService';

type SoundType = 'click' | 'success' | 'error' | 'toggle' | 'complete' | 'notification' | 'pop' | 'swoosh';

export function useSound() {
  const play = useCallback((type: SoundType) => {
    soundService.play(type);
  }, []);

  const click = useCallback(() => soundService.click(), []);
  const success = useCallback(() => soundService.success(), []);
  const error = useCallback(() => soundService.error(), []);
  const toggle = useCallback(() => soundService.toggle(), []);
  const complete = useCallback(() => soundService.complete(), []);
  const notification = useCallback(() => soundService.notification(), []);
  const pop = useCallback(() => soundService.pop(), []);
  const swoosh = useCallback(() => soundService.swoosh(), []);

  const setEnabled = useCallback((enabled: boolean) => {
    soundService.setEnabled(enabled);
  }, []);

  const isEnabled = useCallback(() => soundService.isEnabled(), []);

  const setVolume = useCallback((volume: number) => {
    soundService.setVolume(volume);
  }, []);

  const getVolume = useCallback(() => soundService.getVolume(), []);

  return {
    play,
    click,
    success,
    error,
    toggle,
    complete,
    notification,
    pop,
    swoosh,
    setEnabled,
    isEnabled,
    setVolume,
    getVolume,
  };
}
