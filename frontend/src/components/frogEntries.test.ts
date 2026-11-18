import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import { translate } from '../i18n/translate';
import { FROG_ENTRIES, TONES, toneFor } from './frogEntries';

describe('FROG_ENTRIES', () => {
  it('holds exactly the 19 entries of en.json, in its order', () => {
    expect(FROG_ENTRIES).toHaveLength(19);
    expect(FROG_ENTRIES.map((entry) => entry.id)).toEqual(Object.keys(en.frogSpinner.entries));
  });

  it('has unique ids', () => {
    expect(new Set(FROG_ENTRIES.map((entry) => entry.id)).size).toBe(FROG_ENTRIES.length);
  });

  it('resolves every title and blurb to a non-empty string', () => {
    for (const entry of FROG_ENTRIES) {
      for (const key of [entry.titleKey, entry.blurbKey]) {
        const text = translate(en, key);
        expect(text, key).not.toBe(key);
        expect(text.trim(), key).not.toBe('');
      }
    }
  });

  it('has unique titles (tests and visitors tell cards apart by title)', () => {
    const titles = FROG_ENTRIES.map((entry) => translate(en, entry.titleKey));
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('gives each entry the tone toneFor assigns it', () => {
    FROG_ENTRIES.forEach((entry, index) => expect(entry.tone).toBe(toneFor(index, FROG_ENTRIES.length)));
  });

  it('gives every entry a non-empty image URL', () => {
    for (const entry of FROG_ENTRIES) {
      expect(entry.image, entry.id).toBeTypeOf('string');
      expect(entry.image, entry.id).not.toBe('');
    }
  });

  it('gives every entry its own picture, named after its id', () => {
    const images = FROG_ENTRIES.map((entry) => entry.image);
    expect(new Set(images).size).toBe(images.length);
    for (const entry of FROG_ENTRIES) expect(entry.image, entry.id).toContain(`${entry.id}.`);
  });
});

describe('toneFor', () => {
  const counts = Array.from({ length: 29 }, (_, i) => i + 2); // 2 to 30

  it.each(counts)('gives neighbours different tones, including last to first, for %i entries', (count) => {
    const tones = Array.from({ length: count }, (_, index) => toneFor(index, count));
    for (let index = 0; index < count; index++) {
      expect(tones[index], `entries ${index} and ${(index + 1) % count}`).not.toBe(tones[(index + 1) % count]);
    }
    if (count >= 3) expect(new Set(tones)).toEqual(new Set(TONES));
  });

  it('gives a single entry the first tone', () => {
    expect(toneFor(0, 1)).toBe(TONES[0]);
  });
});
