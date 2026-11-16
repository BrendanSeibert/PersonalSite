import { useEffect, useReducer, useRef, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { nextExpansion } from './frogExpansion';

// The open-and-close rules of an expandable card, first written for the spinner's landed card and
// shared with the favorites panel (frogExpansion.ts has the pure state table):
// - a click, a tap, or Enter or Space on the face opens it; touch always opens, mouse and keyboard toggle;
// - Escape, a click or tap outside, or keyboard focus moving away closes it.
// Spread `wrapperProps` onto the element around the card and give it `ref`.
export function useCardExpansion() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [expansion, dispatch] = useReducer(nextExpansion, 'closed');
  const lastPointerType = useRef(''); // set on pointerdown, read by the click that follows
  const pressing = useRef(false); // a pointer is down somewhere on the page while the card is open
  const expanded = expansion === 'open';

  // An opened card may reach below the fold on a phone, or below a scrolling list: bring it into view.
  useEffect(() => {
    if (expanded) ref.current?.scrollIntoView({ block: 'nearest' });
  }, [expanded]);

  // While the card is open, a click or tap outside it returns it to collapsed. It counts only if the
  // press started outside too: a finger landing outside to scroll fires pointerdown but no click,
  // and a text selection dragged past the card's edge ends in a click that started inside.
  useEffect(() => {
    if (!expanded) return;
    let pressStartedOutside = false;
    const isOutside = (target: EventTarget | null) => !(target instanceof Node && ref.current?.contains(target));
    const onPointerDown = (event: PointerEvent) => {
      pressStartedOutside = isOutside(event.target);
      pressing.current = true;
    };
    const onPointerUp = () => {
      pressing.current = false;
    };
    const onClick = (event: globalThis.MouseEvent) => {
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
  }, [expanded]);

  const wrapperProps = {
    // Focusable by script and pointer only (no Tab stop): a press on the description text then
    // moves focus here, inside the card, instead of to <body>, which would close it.
    tabIndex: -1,
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => {
      lastPointerType.current = event.pointerType;
    },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') dispatch({ type: 'dismiss' });
    },
    // React's onBlur bubbles, like focusout. Focus moving within the card (to its heart, say)
    // doesn't count, and neither does switching windows or tabs (document.hasFocus() is then false).
    // Nor does focus moved by a pointer press: the click-outside rule decides those. If the card
    // collapsed on mousedown, whatever is below it would jump up before mouseup and the click would
    // miss it.
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      if (event.currentTarget.contains(event.relatedTarget) || !document.hasFocus()) return;
      if (pressing.current) return;
      dispatch({ type: 'dismiss' });
    },
  } as const;

  // The card face's click. A click made by Enter or Space has detail 0 and no pointer behind it.
  const onActivate = (event: MouseEvent<HTMLButtonElement>) =>
    dispatch({ type: 'activate', pointerType: event.detail === 0 ? '' : lastPointerType.current });

  return { expanded, ref, wrapperProps, onActivate };
}
