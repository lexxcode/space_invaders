export interface KeyState {
  left: boolean;
  right: boolean;
  space: boolean;
  esc: boolean;
}

/** Shared, mutable keyboard state polled by the game each frame. */
export const keys: KeyState = { left: false, right: false, space: false, esc: false };

const CODE_MAP: Record<string, keyof KeyState> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  Space: 'space',
  Escape: 'esc',
};

export interface InputHandlers {
  /** Fired when the window loses focus (used to auto-pause). */
  onBlur: () => void;
  /** Fired once per press of the mute key. */
  onMute: () => void;
}

/** Bind keyboard/blur listeners. */
export function initInput({ onBlur, onMute }: InputHandlers): void {
  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM' && !e.repeat) {
      onMute();
      return;
    }
    const key = CODE_MAP[e.code];
    if (key) keys[key] = true;
  });
  document.addEventListener('keyup', (e) => {
    const key = CODE_MAP[e.code];
    if (key) keys[key] = false;
  });
  window.addEventListener('blur', onBlur);
}
