import type { MouseEvent } from 'react';
import { useI18n } from '../context/I18nContext';
import type { FrogEntry } from './frogEntries';
import './FrogCard.scss';

type Expansion = { expanded: boolean; onActivate: (event: MouseEvent<HTMLButtonElement>) => void; blurbId: string };
type Props = { entry: FrogEntry; expansion?: Expansion };

// One card, drawn the same way on the reel strip and as the landed card. Without `expansion`
// it is static; with it, the face is a disclosure button and the description is rendered.
export function FrogCard({ entry, expansion }: Props) {
  const { t } = useI18n();

  const face = (
    <>
      {entry.image ? (
        <img className="frog-card-image" src={entry.image} alt="" />
      ) : (
        <span className="frog-card-image frog-card-image-empty" />
      )}
      <span className="frog-card-title">{t(entry.titleKey)}</span>
    </>
  );

  return (
    <div
      className={`d-frog-card frog-card frog-card-tone-${entry.tone}`}
      data-expanded={expansion?.expanded ?? false}
    >
      {expansion ? (
        <button
          type="button"
          className="frog-card-face"
          aria-expanded={expansion.expanded}
          aria-controls={expansion.blurbId}
          onClick={expansion.onActivate}
        >
          {face}
        </button>
      ) : (
        <div className="frog-card-face">{face}</div>
      )}
      {expansion && (
        <p id={expansion.blurbId} className="frog-card-blurb" hidden={!expansion.expanded}>
          {t(entry.blurbKey)}
        </p>
      )}
    </div>
  );
}
