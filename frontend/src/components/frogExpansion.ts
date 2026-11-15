export type Expansion = 'closed' | 'hovered' | 'pinned';

export type ExpansionEvent =
  | { type: 'pointerEnter'; pointerType: string }
  | { type: 'pointerLeave'; pointerType: string }
  // A click on the card's face. pointerType is 'touch' for a finger, 'mouse' or 'pen' for
  // those, and '' for a keyboard-made click (Enter or Space).
  | { type: 'activate'; pointerType: string }
  // Back to collapsed: focus left the card, a click or tap outside it, Escape, or a new spin.
  | { type: 'dismiss' };

export function nextExpansion(state: Expansion, event: ExpansionEvent): Expansion {
  switch (event.type) {
    // Hover counts only for a real mouse: phone browsers fire pointerenter on a tap, too.
    case 'pointerEnter':
      return event.pointerType === 'mouse' && state === 'closed' ? 'hovered' : state;
    // Losing hover closes only what hover opened; a pinned card stays open.
    case 'pointerLeave':
      return event.pointerType === 'mouse' && state === 'hovered' ? 'closed' : state;
    // Touch always opens (close by tapping outside); mouse and keyboard toggle.
    case 'activate':
      if (event.pointerType === 'touch') return 'pinned';
      return state === 'pinned' ? 'closed' : 'pinned';
    case 'dismiss':
      return 'closed';
  }
}
