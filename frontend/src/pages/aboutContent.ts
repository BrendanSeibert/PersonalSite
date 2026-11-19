import en from '../i18n/en.json';

// The About page's lists: their order and who does each step. The words live in en.json, whose
// key order is the display order (the dictionary allows no arrays, as with frogSpinner.entries).
//
// The structure is read from en.json itself, not from the dictionary the I18nProvider was given,
// so it is fixed at build time and typed. That is safe while English is the only dictionary: a
// dictionary passed in (as noHardcodedText.test.tsx does) must have the same keys. A second
// language would need these lists built from the active dictionary instead.

// Who does a step. Code, not copy; the chip's words are about.who.<id>.
export type Who = keyof typeof en.about.who;

// The chip colour for each "who": every Claude role shares one tone, so the colours say "Claude,
// me or the tests" and the words say which Claude.
export type Tone = 'claude' | 'me' | 'tests';
export const WHO_TONE: Record<Who, Tone> = {
  claude: 'claude',
  fresh: 'claude',
  orchestrator: 'claude',
  agents: 'claude',
  me: 'me',
  tests: 'tests',
};

type StepId = keyof typeof en.about.loop.steps;
type StageId = keyof typeof en.about.passes.stages;
type LensId = keyof typeof en.about.passes.lenses;
type LayerId = keyof typeof en.about.guardrails.layers;
type LessonId = keyof typeof en.about.lessons.items;

// A Record over every id: a step added to en.json without a "who" fails to compile.
export const LOOP_WHO: Record<StepId, Who> = {
  plan: 'claude',
  reviewPlan: 'fresh',
  decide: 'me',
  build: 'claude',
  prove: 'tests',
  reviewChange: 'fresh',
  commit: 'me',
};

export const PASS_WHO: Record<StageId, Who> = {
  split: 'orchestrator',
  review: 'agents',
  verify: 'orchestrator',
  fix: 'agents',
  merge: 'orchestrator',
};

// The stage that fans out to the lens chips.
export const LENS_STAGE: StageId = 'review';

export const LOOP_STEPS = Object.keys(en.about.loop.steps) as StepId[];
export const PASS_STAGES = Object.keys(en.about.passes.stages) as StageId[];
export const PASS_LENSES = Object.keys(en.about.passes.lenses) as LensId[];
export const GUARDRAIL_LAYERS = Object.keys(en.about.guardrails.layers) as LayerId[];
export const LESSONS = Object.keys(en.about.lessons.items) as LessonId[];
