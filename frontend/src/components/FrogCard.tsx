import type { MouseEvent } from 'react';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translate';
import { FavoriteButton } from './FavoriteButton';
import type { FrogEntry } from './frogEntries';
import './FrogCard.scss';

type Expansion = { expanded: boolean; onActivate: (event: MouseEvent<HTMLButtonElement>) => void; blurbId: string };
// The top-right corner: a heart, and optionally a like count beside it.
type Corner = {
  heart?: boolean; // show the favorite button in the top-right corner
  likes?: number; // and this all-time count beside it (All Time Favorites)
};
// A union, so a meaningless combination fails to compile: `full` with `concealed` or `expansion`,
// or a heart on a concealed reel card (it has no title, and it spins).
type Props = { entry: FrogEntry } & (
  | ({
      // Always open and not interactive: an <article> with the large image, an <h3> title and
      // the description. Used on the Frog Library page.
      full: true;
      expansion?: never;
      concealed?: never;
      fitsRow?: never; // a library card always shows its whole title
    } & Corner)
  | ({
      full?: false;
      expansion?: Expansion;
      concealed?: false;
      // Exactly one reel row tall, with the title cut at two lines: the landed card, which sits on
      // the payline. Every other collapsed card grows to show its whole title.
      fitsRow?: boolean;
    } & Corner)
  | {
      full?: false;
      fitsRow?: boolean; // a concealed card always fits a row
      expansion?: never;
      // A skeleton in the card's colours: an image block and a title bar, with no picture or text.
      // Used on the reel, so only the landed card gives away what it is.
      concealed: true;
      heart?: never;
      likes?: never;
    }
);

// "1 like" or "12 likes", by the page language's plural rules (English if the language is unknown).
function likesKey(lang: string, count: number): TranslationKey {
  let rules: Intl.PluralRules;
  try {
    rules = new Intl.PluralRules(lang);
  } catch {
    rules = new Intl.PluralRules('en');
  }
  return rules.select(count) === 'one' ? 'favorites.likes.one' : 'favorites.likes.other';
}

// One card, drawn the same way on the reel strip, as the landed card, in the Frog Library and in
// the favorites panel. Without `expansion` it is static; with it, the face is a disclosure button
// and the description is rendered. With `full` it is always open and not interactive.
export function FrogCard({
  entry,
  expansion,
  concealed = false,
  full = false,
  fitsRow = false,
  heart = false,
  likes,
}: Props) {
  const { t } = useI18n();
  const image = entry.image ? (
    <img className="frog-card-image" src={entry.image} alt="" loading="lazy" />
  ) : (
    <span className="frog-card-image frog-card-image-empty" />
  );
  const classes = `d-frog-card frog-card frog-card-tone-${entry.tone}`;

  // The last child of the card, a sibling of the face: a button can't hold another button, and
  // pressing the heart must never open or close the card.
  const corner = heart && (
    <div className="frog-card-corner">
      {likes !== undefined && (
        <span className="frog-card-likes">
          <span aria-hidden="true">{t('favorites.countShort', { count: likes })}</span>
          <span className="visually-hidden">{t(likesKey(t('app.lang'), likes), { count: likes })}</span>
        </span>
      )}
      <FavoriteButton entry={entry} />
    </div>
  );

  if (full) {
    return (
      <article className={`${classes} frog-card-full`} data-entry-id={entry.id}>
        <div className="frog-card-face">
          {image}
          <h3 className="frog-card-title">{t(entry.titleKey)}</h3>
        </div>
        <p className="frog-card-blurb">{t(entry.blurbKey)}</p>
        {corner}
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
    <div
      className={classes}
      data-entry-id={entry.id}
      data-expanded={expansion?.expanded ?? false}
      data-fits-row={fitsRow || concealed}
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
      {corner}
    </div>
  );
}
