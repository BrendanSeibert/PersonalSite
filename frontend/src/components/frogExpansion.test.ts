import { describe, expect, it } from 'vitest';
import { nextExpansion, type Expansion, type ExpansionEvent } from './frogExpansion';

const activate = (pointerType: string): ExpansionEvent => ({ type: 'activate', pointerType });
const dismiss: ExpansionEvent = { type: 'dismiss' };

const STATES: Expansion[] = ['closed', 'open'];
// A new Expansion member fails tsc -b here until it is added to this record and to STATES.
const _exhaustive: Record<Expansion, true> = { closed: true, open: true };
void _exhaustive;
const POINTER_TYPES = ['mouse', 'touch', 'pen', '']; // '' is a keyboard-made click (frogExpansion.ts)
const EVENTS: ExpansionEvent[] = [...POINTER_TYPES.map(activate), dismiss];

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

  it('has a row for every state × event combination', () => {
    const rows = new Set(TABLE.map(([state, event]) => `${state}|${JSON.stringify(event)}`));
    for (const state of STATES) {
      for (const event of EVENTS) {
        expect(rows).toContain(`${state}|${JSON.stringify(event)}`);
      }
    }
  });
});
