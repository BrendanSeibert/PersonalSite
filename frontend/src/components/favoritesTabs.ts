// The favorites panel's two tabs, in order, and the WAI-ARIA tabs keyboard rule: arrows move
// and wrap, Home and End jump to the ends. Any other key: undefined (the panel ignores it).
export const MODES = ['mine', 'allTime'] as const;
export type Mode = (typeof MODES)[number];

export function nextTab(current: Mode, key: string): Mode | undefined {
  const index = MODES.indexOf(current);
  switch (key) {
    case 'ArrowRight':
      return MODES[(index + 1) % MODES.length];
    case 'ArrowLeft':
      return MODES[(index - 1 + MODES.length) % MODES.length];
    case 'Home':
      return MODES[0];
    case 'End':
      return MODES[MODES.length - 1];
    default:
      return undefined;
  }
}
