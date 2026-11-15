import type { MouseEvent } from 'react';
import { useI18n } from '../context/I18nContext';
import type { FrogEntry } from './frogEntries';
import './FrogCard.scss';

type Expansion = { expanded: boolean; onActivate: (event: MouseEvent<HTMLButtonElement>) => void; blurbId: string };
type Props = {
  entry: FrogEntry;
  expansion?: Expansion;
  // A skeleton in the card's colours: an image block and a title bar, with no picture or text.
  // Used on the reel, so only the landed card gives away what it is.
  concealed?: boolean;
};

// One card, drawn the same way on the reel strip and as the landed card. Without `expansion`
// it is static; with it, the face is a disclosure button and the description is rendered.
export function FrogCard({ entry, expansion, concealed = false }: Props) {
  const { t } = useI18n();

  let face;
  if (concealed) {
    face = (
      <>
        <span className="frog-card-image frog-card-image-concealed" />
        <span className="frog-card-title-concealed" />
      </>
    );
  } else {
    face = (
      <>
        {entry.image ? (
          <img className="frog-card-image" src={entry.image} alt="" />
        ) : (
          <span className="frog-card-image frog-card-image-empty" />
        )}
        <span className="frog-card-title">{t(entry.titleKey)}</span>
      </>
    );
  }

  return (
    <div
      className={`d-frog-card frog-card frog-card-tone-${entry.tone}`}
      data-entry-id={entry.id}
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
