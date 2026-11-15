import { describe, expect, it } from 'vitest';
import { nextExpansion, type Expansion, type ExpansionEvent } from './frogExpansion';

const enter = (pointerType: string): ExpansionEvent => ({ type: 'pointerEnter', pointerType });
const leave = (pointerType: string): ExpansionEvent => ({ type: 'pointerLeave', pointerType });
const activate = (pointerType: string): ExpansionEvent => ({ type: 'activate', pointerType });
const dismiss: ExpansionEvent = { type: 'dismiss' };

// [state, event, expected]: every state × every event.
const TABLE: Array<[Expansion, ExpansionEvent, Expansion]> = [
  // Mouse enter opens a closed card as hovered; touch and pen "hover" never count.
  ['closed', enter('mouse'), 'hovered'],
  ['closed', enter('touch'), 'closed'],
  ['closed', enter('pen'), 'closed'],
  ['hovered', enter('mouse'), 'hovered'],
  ['hovered', enter('touch'), 'hovered'],
  ['hovered', enter('pen'), 'hovered'],
  ['pinned', enter('mouse'), 'pinned'],
  ['pinned', enter('touch'), 'pinned'],
  ['pinned', enter('pen'), 'pinned'],

  // Mouse leave closes only a hovered card.
  ['closed', leave('mouse'), 'closed'],
  ['closed', leave('touch'), 'closed'],
  ['closed', leave('pen'), 'closed'],
  ['hovered', leave('mouse'), 'closed'],
  ['hovered', leave('touch'), 'hovered'],
  ['hovered', leave('pen'), 'hovered'],
  ['pinned', leave('mouse'), 'pinned'],
  ['pinned', leave('touch'), 'pinned'],
  ['pinned', leave('pen'), 'pinned'],

  // Touch always opens; mouse, pen and keyboard toggle pinned.
  ['closed', activate('mouse'), 'pinned'],
  ['closed', activate('touch'), 'pinned'],
  ['closed', activate('pen'), 'pinned'],
  ['closed', activate(''), 'pinned'],
  ['hovered', activate('mouse'), 'pinned'],
  ['hovered', activate('touch'), 'pinned'],
  ['hovered', activate('pen'), 'pinned'],
  ['hovered', activate(''), 'pinned'],
  ['pinned', activate('mouse'), 'closed'],
  ['pinned', activate('touch'), 'pinned'],
  ['pinned', activate('pen'), 'closed'],
  ['pinned', activate(''), 'closed'],

  // Dismiss always closes.
  ['closed', dismiss, 'closed'],
  ['hovered', dismiss, 'closed'],
  ['pinned', dismiss, 'closed'],
];

describe('nextExpansion', () => {
  it.each(TABLE)('%s + %o → %s', (state, event, expected) => {
    expect(nextExpansion(state, event)).toBe(expected);
  });

  it('covers every state × event combination', () => {
    expect(TABLE).toHaveLength(3 * (3 + 3 + 4 + 1));
  });
});
