import { describe, expect, it } from 'vitest';
import { nextExpansion, type Expansion, type ExpansionEvent } from './frogExpansion';

const activate = (pointerType: string): ExpansionEvent => ({ type: 'activate', pointerType });
const dismiss: ExpansionEvent = { type: 'dismiss' };

// [state, event, expected]: every state × every event.
const TABLE: Array<[Expansion, ExpansionEvent, Expansion]> = [
  // Touch always opens; mouse, pen and keyboard toggle.
  ['closed', activate('mouse'), 'open'],
  ['closed', activate('touch'), 'open'],
  ['closed', activate('pen'), 'open'],
  ['closed', activate(''), 'open'],
  ['open', activate('mouse'), 'closed'],
  ['open', activate('touch'), 'open'], // a second tap never closes
  ['open', activate('pen'), 'closed'],
  ['open', activate(''), 'closed'],

  // Dismiss always closes.
  ['closed', dismiss, 'closed'],
  ['open', dismiss, 'closed'],
];

describe('nextExpansion', () => {
  it.each(TABLE)('%s + %o → %s', (state, event, expected) => {
    expect(nextExpansion(state, event)).toBe(expected);
  });

  it('covers every state × event combination', () => {
    expect(TABLE).toHaveLength(2 * (4 + 1));
  });
});
