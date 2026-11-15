// The landed card opens only on purpose: a click, a tap, or Enter or Space. Hovering does nothing.
export type Expansion = 'closed' | 'open';

export type ExpansionEvent =
  // A click on the card's face. pointerType is 'touch' for a finger, 'mouse' or 'pen' for
  // those, and '' for a keyboard-made click (Enter or Space).
  | { type: 'activate'; pointerType: string }
  // Back to collapsed: focus left the card, a click or tap outside it, Escape, or a new spin.
  | { type: 'dismiss' };

export function nextExpansion(state: Expansion, event: ExpansionEvent): Expansion {
  switch (event.type) {
    // Touch always opens (close by tapping outside, so tapping the text while reading keeps it
    // open); mouse, pen and keyboard toggle.
    case 'activate':
      if (event.pointerType === 'touch') return 'open';
      return state === 'open' ? 'closed' : 'open';
    case 'dismiss':
      return 'closed';
  }
}
