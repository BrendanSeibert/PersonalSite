import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import {
  GUARDRAIL_LAYERS,
  LENS_STAGE,
  LESSONS,
  LOOP_STEPS,
  LOOP_WHO,
  PASS_LENSES,
  PASS_STAGES,
  PASS_WHO,
  WHO_TONE,
} from './aboutContent';

// The number words the lessons heading may use. A count missing here fails the heading test, so a
// ninth lesson can't ship under "Eight lessons".
const NUMBER_WORDS: Record<number, string> = { 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine', 10: 'Ten' };

// The heading's number word matches the lesson count.
function lessonsHeadingMatches(heading: string, count: number) {
  const word = NUMBER_WORDS[count];
  return word !== undefined && heading === `${word} lessons`;
}

describe('the About page lists', () => {
  it.each([
    ['loop steps', LOOP_STEPS, en.about.loop.steps],
    ['pass stages', PASS_STAGES, en.about.passes.stages],
    ['pass lenses', PASS_LENSES, en.about.passes.lenses],
    ['guardrail layers', GUARDRAIL_LAYERS, en.about.guardrails.layers],
    ['lessons', LESSONS, en.about.lessons.items],
  ])('%s are non-empty and in en.json’s key order', (_name, list, source) => {
    expect(list.length).toBeGreaterThan(0);
    expect([...list]).toEqual(Object.keys(source));
  });

  it('keeps the loop, the passes and the funnel in the order the page tells them', () => {
    expect(LOOP_STEPS).toEqual(['plan', 'reviewPlan', 'decide', 'build', 'prove', 'reviewChange', 'commit']);
    expect(PASS_STAGES).toEqual(['split', 'review', 'verify', 'fix', 'merge']);
    expect(GUARDRAIL_LAYERS[0]).toBe('rulebook');
    expect(GUARDRAIL_LAYERS.at(-1)).toBe('me'); // a human is the last layer
  });

  it('gives every loop step and pass stage exactly one "who", and no extras', () => {
    expect(Object.keys(LOOP_WHO).sort()).toEqual([...LOOP_STEPS].sort());
    expect(Object.keys(PASS_WHO).sort()).toEqual([...PASS_STAGES].sort());
  });

  it('only names people and tools that have a label in en.json', () => {
    for (const who of [...Object.values(LOOP_WHO), ...Object.values(PASS_WHO)]) {
      expect(Object.keys(en.about.who)).toContain(who);
    }
  });

  it('leaves deciding and committing to me, and the parallel work to the agents', () => {
    expect(LOOP_WHO.decide).toBe('me');
    expect(LOOP_WHO.commit).toBe('me');
    expect(PASS_WHO.review).toBe('agents');
    expect(PASS_WHO.fix).toBe('agents');
    expect(PASS_WHO.merge).toBe('orchestrator');
  });

  it('has words in every about.* string (an emptied one would leave a blank on the page)', () => {
    const leaves = (node: object, path: string): [string, unknown][] =>
      Object.entries(node).flatMap(([key, value]) =>
        typeof value === 'object' && value !== null ? leaves(value, `${path}.${key}`) : [[`${path}.${key}`, value]],
      );
    const all = leaves(en.about, 'about');
    // Exactly the strings the page reads, so a missing or stray key fails too: six plain strings
    // (heading, lead, gitHub, body, source, sourceUrl), then each section's own strings plus its items.
    const expected =
      6 +
      (4 + 2 * LOOP_STEPS.length) +
      Object.keys(en.about.who).length +
      (3 + PASS_LENSES.length + 2 * PASS_STAGES.length) +
      (2 + 2 * GUARDRAIL_LAYERS.length) +
      (3 + 3 * LESSONS.length) +
      2;
    expect(all).toHaveLength(expected);
    for (const [path, value] of all) expect(typeof value === 'string' && value.trim() !== '', path).toBe(true);
  });

  it('gives each "who" a chip tone: every Claude role shares one, me and the tests have their own', () => {
    expect(Object.keys(WHO_TONE).sort()).toEqual(Object.keys(en.about.who).sort());
    expect(WHO_TONE).toEqual({
      claude: 'claude',
      fresh: 'claude',
      orchestrator: 'claude',
      agents: 'claude',
      me: 'me',
      tests: 'tests',
    });
  });

  it('keeps "Claude‑assisted" in the lead on one line (a non-breaking hyphen, U+2011)', () => {
    // A plain hyphen lets the line break after "Claude-", which left a ragged edge on desktop.
    // Retyping the word in en.json brings the plain hyphen back, so this test notices.
    expect(en.about.lead).toContain('Claude‑assisted');
    expect(en.about.lead).not.toContain('Claude-assisted');
  });

  it('fans the lenses out from a real stage', () => {
    expect(PASS_STAGES).toContain(LENS_STAGE);
  });

  it('names the lesson count in the lessons heading', () => {
    expect(lessonsHeadingMatches(en.about.lessons.heading, LESSONS.length)).toBe(true);
  });

  // The plan's breakage step, kept as a test: the real lessons plus one more, heading unchanged.
  it('fails the heading check when a lesson is added to en.json without updating the heading', () => {
    const withExtra = { ...en.about.lessons.items, extra: { title: 'Extra', happened: 'Extra.', now: 'Extra.' } };
    expect(lessonsHeadingMatches(en.about.lessons.heading, Object.keys(withExtra).length)).toBe(false);
    const { sentences: _removed, ...withOneFewer } = en.about.lessons.items;
    expect(lessonsHeadingMatches(en.about.lessons.heading, Object.keys(withOneFewer).length)).toBe(false);
  });
});
