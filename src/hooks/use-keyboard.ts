'use client';

import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;
type KeyMap = Record<string, KeyHandler>;

export function useKeyboard(
  keyMap: KeyMap,
  options: { enabled?: boolean; preventDefault?: boolean } = {}
) {
  const { enabled = true, preventDefault = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const key = event.key;
      const code = event.code;
      const combo = [
        event.ctrlKey ? 'Ctrl' : '',
        event.shiftKey ? 'Shift' : '',
        event.altKey ? 'Alt' : '',
        event.metaKey ? 'Meta' : '',
        key,
      ]
        .filter(Boolean)
        .join('+');

      // Try exact match first, then key, then code
      const handler = keyMap[combo] || keyMap[key] || keyMap[code];
      if (handler) {
        if (preventDefault) {
          event.preventDefault();
        }
        handler(event);
      }
    },
    [keyMap, enabled, preventDefault]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const VIDEO_KEYBOARD_SHORTCUTS = {
  SPACE: ' ',
  PLAY_PAUSE: 'Space',
  FULLSCREEN: 'f',
  MUTE: 'm',
  PICTURE_IN_PICTURE: 'p',
  SKIP_FORWARD: 'ArrowRight',
  SKIP_BACKWARD: 'ArrowLeft',
  VOLUME_UP: 'ArrowUp',
  VOLUME_DOWN: 'ArrowDown',
  SPEED_UP: '>',
  SPEED_DOWN: '<',
  CAPTIONS: 'c',
  SEEK_10: '0',
  SEEK_20: '1',
  SEEK_30: '2',
  SEEK_40: '3',
  SEEK_50: '4',
  SEEK_60: '5',
  SEEK_70: '6',
  SEEK_80: '7',
  SEEK_90: '8',
  THEATER_MODE: 't',
} as const;
