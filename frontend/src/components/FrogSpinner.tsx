import { useEffect, useId, useLayoutEffect, useMemo, useReducer, useRef, useState, type CSSProperties } from 'react';
import { useI18n } from '../context/I18nContext';
import { FrogCard } from './FrogCard';
import { FROG_ENTRIES, type FrogEntry } from './frogEntries';
import { nextExpansion } from './frogExpansion';
import { pickNextIndex, REPEATS, restingOffset, spinOffset } from './frogReel';
import './FrogSpinner.scss';

type Phase = 'idle' | 'spinning' | 'landed';
type Props = {
  entries?: FrogEntry[]; // defaults to the en.json list; tests pass their own
  random?: () => number; // injectable so tests can choose the entry
};

export function FrogSpinner({ entries = FROG_ENTRIES, random = Math.random }: Props) {
  const { t } = useI18n();
  const blurbId = useId();
  const pickRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(() => restingOffset(0, entries.length));
  const [expansion, dispatch] = useReducer(nextExpansion, 'closed');

  const strip = useMemo(
    () => Array.from({ length: entries.length * REPEATS }, (_, row) => entries[row % entries.length]),
    [entries],
  );

  const lastPointerType = useRef(''); // set on pointerdown, read by the click that follows
  const pressing = useRef(false); // a pointer is down somewhere on the page while the card is open

  // An opened card may reach below the fold on a phone: bring it into view.
  useEffect(() => {
    if (expansion === 'open') pickRef.current?.scrollIntoView({ block: 'nearest' });
  }, [expansion]);

  // The open card overlays the page instead of growing it. On desktop the page doesn't scroll, so
  // tell the stylesheet how much room is left below the card (to the viewport's bottom, less 1rem);
  // the card scrolls inside itself beyond that. The stylesheet ignores it on phones, which scroll.
  useLayoutEffect(() => {
    const pick = pickRef.current;
    if (expansion === 'closed' || !pick) return;
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
  }, [expansion]);

  // While the card is open, a click or tap outside it returns it to collapsed. It counts only if the
  // press started outside too: a finger landing outside to scroll fires pointerdown but no click,
  // and a text selection dragged past the card's edge ends in a click that started inside.
  useEffect(() => {
    if (expansion === 'closed') return;
    let pressStartedOutside = false;
    const isOutside = (target: EventTarget | null) =>
      !(target instanceof Node && pickRef.current?.contains(target));
    const onPointerDown = (event: PointerEvent) => {
      pressStartedOutside = isOutside(event.target);
      pressing.current = true;
    };
    const onPointerUp = () => {
      pressing.current = false;
    };
    const onClick = (event: MouseEvent) => {
      if (pressStartedOutside && isOutside(event.target)) dispatch({ type: 'dismiss' });
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('pointerup', onPointerUp, true);
    document.addEventListener('pointercancel', onPointerUp, true);
    document.addEventListener('click', onClick, true);
    return () => {
      pressing.current = false;
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('pointercancel', onPointerUp, true);
      document.removeEventListener('click', onClick, true);
    };
  }, [expansion]);

  function spin() {
    if (phase === 'spinning') return; // aria-disabled does not block clicks; this does
    dispatch({ type: 'dismiss' });
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
          <div
            ref={pickRef}
            className="frog-spinner-pick"
            // Focusable by script and pointer only (no Tab stop): a press on the description text
            // then moves focus here, inside the card, instead of to <body>, which would close it.
            tabIndex={-1}
            onPointerDown={(event) => {
              lastPointerType.current = event.pointerType;
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') dispatch({ type: 'dismiss' });
            }}
            // React's onBlur bubbles, like focusout. Focus moving within the card doesn't count,
            // and neither does switching windows or tabs (document.hasFocus() is then false).
            // Nor does focus moved by a pointer press: the click-outside rule decides those. If the
            // card collapsed on mousedown, "Get a frog" would jump up before mouseup and the click
            // would miss it.
            onBlur={(event) => {
              if (event.currentTarget.contains(event.relatedTarget) || !document.hasFocus()) return;
              if (pressing.current) return;
              dispatch({ type: 'dismiss' });
            }}
          >
            <FrogCard
              entry={picked}
              expansion={{
                expanded: expansion !== 'closed',
                blurbId,
                // A click made by Enter or Space has detail 0 and no pointer behind it.
                onActivate: (event) =>
                  dispatch({ type: 'activate', pointerType: event.detail === 0 ? '' : lastPointerType.current }),
              }}
            />
          </div>
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
