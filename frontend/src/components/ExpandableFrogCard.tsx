import { useId, useLayoutEffect } from 'react';
import { FrogCard } from './FrogCard';
import type { FrogEntry } from './frogEntries';
import { useCardExpansion } from './useCardExpansion';

type Props = {
  entry: FrogEntry;
  className?: string; // for the wrapper, which the caller positions
  heart?: boolean;
  likes?: number;
  // Runs while the card is open, given the wrapper; return a cleanup. It runs in the same commit
  // that opens the card, before the card is painted or scrolled into view, so a caller can size
  // things around the open card first (the spinner caps it at the screen's bottom edge).
  whileOpen?: (wrapper: HTMLDivElement) => (() => void) | void;
};

// A collapsed card that opens to show its description, and closes again, by the rules in
// useCardExpansion. The spinner's landed card and every card in the favorites panel are one.
export function ExpandableFrogCard({ entry, className, heart, likes, whileOpen }: Props) {
  const blurbId = useId();
  const { expanded, ref, wrapperProps, onActivate } = useCardExpansion();

  useLayoutEffect(() => {
    const wrapper = ref.current;
    if (!expanded || !wrapper || !whileOpen) return;
    return whileOpen(wrapper);
  }, [expanded, ref, whileOpen]);

  return (
    <div ref={ref} className={className} {...wrapperProps}>
      <FrogCard entry={entry} expansion={{ expanded, blurbId, onActivate }} heart={heart} likes={likes} />
    </div>
  );
}
