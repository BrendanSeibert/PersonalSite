import { useMemo, useState, type CSSProperties } from 'react';
import { useI18n } from '../context/I18nContext';
import { ExpandableFrogCard } from './ExpandableFrogCard';
import { FrogCard } from './FrogCard';
import { FROG_ENTRIES, type FrogEntry } from './frogEntries';
import { pickNextIndex, REPEATS, restingOffset, spinOffset } from './frogReel';
import './FrogSpinner.scss';

type Phase = 'idle' | 'spinning' | 'landed';

// The open card overlays the page instead of growing it. On desktop the page doesn't scroll, so
// tell the stylesheet how much room is left below the card (to the viewport's bottom, less 1rem);
// the card scrolls inside itself beyond that. The stylesheet ignores it on phones, which scroll.
// Runs while the landed card is open, before it is painted or scrolled into view.
function fitOpenCard(pick: HTMLDivElement) {
  const measure = () => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const space = document.documentElement.clientHeight - pick.getBoundingClientRect().top - rem;
    pick.style.setProperty('--frog-spinner-pick-space', `${Math.max(space, 0)}px`);
  };
  measure();
  window.addEventListener('resize', measure);
  return () => {
    window.removeEventListener('resize', measure);
    pick.style.removeProperty('--frog-spinner-pick-space');
  };
}

type Props = {
  entries?: FrogEntry[]; // defaults to the en.json list; tests pass their own
  random?: () => number; // injectable so tests can choose the entry
};

export function FrogSpinner({ entries = FROG_ENTRIES, random = Math.random }: Props) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>('idle');
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(() => restingOffset(0, entries.length));

  const strip = useMemo(
    () => Array.from({ length: entries.length * REPEATS }, (_, row) => entries[row % entries.length]),
    [entries],
  );

  function spin() {
    if (phase === 'spinning') return; // aria-disabled does not block clicks; this does
    const next = pickNextIndex(entries.length, index, random);
    setIndex(next);
    setOffset(spinOffset(next, entries.length));
    setPhase('spinning');
  }

  function land() {
    if (phase !== 'spinning') return;
    // Same entry, earlier copy, with the transition off: the window shows the same cards, so nothing jumps.
    setOffset(restingOffset(index, entries.length));
    setPhase('landed');
  }

  const picked = entries[index];
  let status = t('frogSpinner.prompt');
  if (phase === 'spinning') status = t('frogSpinner.spinning');
  else if (phase === 'landed') status = t('frogSpinner.result', { title: t(picked.titleKey) });

  return (
    <div className="d-frog-spinner frog-spinner">
      <div className="frog-spinner-reel" data-phase={phase}>
        {/* Decorative: screen readers get the result from the status line and the landed card. */}
        <div className="frog-spinner-window" aria-hidden="true">
          <ul
            className={phase === 'spinning' ? 'frog-spinner-strip frog-spinner-strip-spinning' : 'frog-spinner-strip'}
            style={{ '--frog-spinner-offset': offset } as CSSProperties}
            onTransitionEnd={(event) => {
              if (event.target === event.currentTarget) land(); // ignore transitions bubbling up from cards
            }}
          >
            {strip.map((entry, row) => (
              <li key={row} className="frog-spinner-row">
                <FrogCard entry={entry} concealed />
              </li>
            ))}
          </ul>
        </div>
        {phase === 'landed' && (
          // The open and close rules live in useCardExpansion, shared with the favorites panel.
          // Its heart is the only way to favorite this frog: landing on it never does.
          <ExpandableFrogCard className="frog-spinner-pick" entry={picked} heart whileOpen={fitOpenCard} />
        )}
      </div>
      <button type="button" className="frog-spinner-button" aria-disabled={phase === 'spinning'} onClick={spin}>
        {t('frogSpinner.button')}
      </button>
      <p className="frog-spinner-result" role="status">
        {status}
      </p>
    </div>
  );
}
