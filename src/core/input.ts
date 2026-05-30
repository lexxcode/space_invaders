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

/** Bind keyboard/blur listeners. `onBlur` lets the game pause when it loses focus. */
export function initInput(onBlur: () => void): void {
  document.addEventListener('keydown', (e) => {
    const key = CODE_MAP[e.code];
    if (key) keys[key] = true;
  });
  document.addEventListener('keyup', (e) => {
    const key = CODE_MAP[e.code];
    if (key) keys[key] = false;
  });
  window.addEventListener('blur', onBlur);
}
