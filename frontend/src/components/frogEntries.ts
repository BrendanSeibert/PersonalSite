import en from '../i18n/en.json';
import entry01 from '../assets/frog-entries/entry01.webp';
import entry02 from '../assets/frog-entries/entry02.webp';
import entry03 from '../assets/frog-entries/entry03.webp';
import entry04 from '../assets/frog-entries/entry04.webp';
import entry05 from '../assets/frog-entries/entry05.webp';
import entry06 from '../assets/frog-entries/entry06.webp';
import entry07 from '../assets/frog-entries/entry07.webp';
import entry08 from '../assets/frog-entries/entry08.webp';
import entry09 from '../assets/frog-entries/entry09.webp';
import entry10 from '../assets/frog-entries/entry10.webp';
import entry11 from '../assets/frog-entries/entry11.webp';
import entry12 from '../assets/frog-entries/entry12.webp';
import entry13 from '../assets/frog-entries/entry13.webp';
import entry14 from '../assets/frog-entries/entry14.webp';
import entry15 from '../assets/frog-entries/entry15.webp';
import entry16 from '../assets/frog-entries/entry16.webp';
import entry17 from '../assets/frog-entries/entry17.webp';
import entry18 from '../assets/frog-entries/entry18.webp';
import entry19 from '../assets/frog-entries/entry19.webp';

export type EntryId = keyof typeof en.frogSpinner.entries;

// Named by mood, not colour: bare colour words like "green" are flagged by styleConventions.test.ts.
export const TONES = ['sand', 'sage', 'sky'] as const;
export type Tone = (typeof TONES)[number];

export type FrogEntry = {
  id: EntryId;
  titleKey: `frogSpinner.entries.${EntryId}.title`;
  blurbKey: `frogSpinner.entries.${EntryId}.blurb`;
  tone: Tone;
  image?: string; // a URL from an `import`; every real entry has one, tests and custom entries may not
};

// One picture per entry, cropped square to fit the card's image slot. A full Record, so an entry
// without a picture fails to compile.
const IMAGES: Record<EntryId, string> = {
  entry01,
  entry02,
  entry03,
  entry04,
  entry05,
  entry06,
  entry07,
  entry08,
  entry09,
  entry10,
  entry11,
  entry12,
  entry13,
  entry14,
  entry15,
  entry16,
  entry17,
  entry18,
  entry19,
};

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
