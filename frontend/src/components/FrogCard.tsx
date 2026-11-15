import type { MouseEvent } from 'react';
import { useI18n } from '../context/I18nContext';
import type { FrogEntry } from './frogEntries';
import './FrogCard.scss';

type Expansion = { expanded: boolean; onActivate: (event: MouseEvent<HTMLButtonElement>) => void; blurbId: string };
// A union, so a meaningless combination (`full` with `concealed` or `expansion`) fails to compile.
type Props = { entry: FrogEntry } & (
  | {
      // Always open and not interactive: an <article> with the large image, an <h3> title and
      // the description. Used on the Frog Library page.
      full: true;
      expansion?: never;
      concealed?: never;
    }
  | {
      full?: false;
      expansion?: Expansion;
      // A skeleton in the card's colours: an image block and a title bar, with no picture or text.
      // Used on the reel, so only the landed card gives away what it is.
      concealed?: boolean;
    }
);

// One card, drawn the same way on the reel strip, as the landed card and in the Frog Library.
// Without `expansion` it is static; with it, the face is a disclosure button and the description
// is rendered. With `full` it is always open and not interactive.
export function FrogCard({ entry, expansion, concealed = false, full = false }: Props) {
  const { t } = useI18n();
  const image = entry.image ? (
    <img className="frog-card-image" src={entry.image} alt="" />
  ) : (
    <span className="frog-card-image frog-card-image-empty" />
  );
  const classes = `d-frog-card frog-card frog-card-tone-${entry.tone}`;

  if (full) {
    return (
      <article className={`${classes} frog-card-full`} data-entry-id={entry.id}>
        <div className="frog-card-face">
          {image}
          <h3 className="frog-card-title">{t(entry.titleKey)}</h3>
        </div>
        <p className="frog-card-blurb">{t(entry.blurbKey)}</p>
      </article>
    );
  }

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
        {image}
        <span className="frog-card-title">{t(entry.titleKey)}</span>
      </>
    );
  }

  return (
    <div className={classes} data-entry-id={entry.id} data-expanded={expansion?.expanded ?? false}>
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
