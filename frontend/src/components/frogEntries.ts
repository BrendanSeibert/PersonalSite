import en from '../i18n/en.json';

export type EntryId = keyof typeof en.frogSpinner.entries;

// Named by mood, not colour: bare colour words like "green" are flagged by styleConventions.test.ts.
export const TONES = ['sand', 'meadow', 'sky'] as const;
export type Tone = (typeof TONES)[number];

export type FrogEntry = {
  id: EntryId;
  titleKey: `frogSpinner.entries.${EntryId}.title`;
  blurbKey: `frogSpinner.entries.${EntryId}.blurb`;
  tone: Tone;
  image?: string; // a URL from an `import`; undefined until a picture is added
};

// Pictures go here as they arrive, for example:
//   import entry01 from '../assets/frog-entries/entry01.webp';
//   const IMAGES: Partial<Record<EntryId, string>> = { entry01 };
const IMAGES: Partial<Record<EntryId, string>> = {};

// Rotate the tones so neighbouring cards differ, including where the strip wraps from the
// last entry back to the first. Plain rotation fails only when count % 3 === 1 (the last and
// the first would both be tone 0), so the last card then takes the middle tone instead.
export function toneFor(index: number, count: number): Tone {
  if (count % TONES.length === 1 && count > 1 && index === count - 1) return TONES[1];
  return TONES[index % TONES.length];
}

// en.json's order is the reel's order.
const ids = Object.keys(en.frogSpinner.entries) as EntryId[];
export const FROG_ENTRIES: FrogEntry[] = ids.map((id, index) => ({
  id,
  titleKey: `frogSpinner.entries.${id}.title`,
  blurbKey: `frogSpinner.entries.${id}.blurb`,
  tone: toneFor(index, ids.length),
  image: IMAGES[id],
}));
