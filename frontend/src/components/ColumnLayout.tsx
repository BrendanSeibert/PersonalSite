import type { ReactNode } from 'react';
import './ColumnLayout.scss';

type Props = {
  middle: ReactNode;
  left: ReactNode;
  right: ReactNode;
  leftLabel: string; // accessible names for the two <aside> landmarks
  rightLabel: string;
};

// DOM order is the small-screen reading order: Middle, Left, Right.
// On wide screens, grid areas (ColumnLayout.scss) place them visually as Left, Middle, Right.
export function ColumnLayout({ middle, left, right, leftLabel, rightLabel }: Props) {
  return (
    <div className="d-column-layout column-layout">
      {/* tabIndex -1: AppLayout focuses <main> after a navigation; never a Tab stop. */}
      <main className="column-layout-column column-layout-middle" tabIndex={-1}>
        {middle}
      </main>
      <aside className="column-layout-column column-layout-left" aria-label={leftLabel}>
        {left}
      </aside>
      <aside className="column-layout-column column-layout-right" aria-label={rightLabel}>
        {right}
      </aside>
    </div>
  );
}
