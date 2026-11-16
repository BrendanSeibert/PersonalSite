import { useId } from 'react';
import { FrogCard } from '../components/FrogCard';
import { FROG_ENTRIES, type FrogEntry } from '../components/frogEntries';
import { useI18n } from '../context/I18nContext';
import './FrogLibraryPage.scss';

type Props = {
  entries?: FrogEntry[]; // defaults to the same list the spinner uses; tests pass their own
};

// Every frog, fully open, in en.json order: one column when stacked, three when wide.
export function FrogLibraryPage({ entries = FROG_ENTRIES }: Props) {
  const { t } = useI18n();
  const headingId = useId();

  return (
    // tabIndex -1: AppLayout focuses <main> after a navigation; never a Tab stop.
    <main className="d-frog-library-page frog-library-page" tabIndex={-1}>
      <div className="frog-library-page-panel">
        <h2 id={headingId}>{t('frogLibrary.heading')}</h2>
        <p className="frog-library-page-intro">{t('frogLibrary.intro')}</p>
        {/* role="list": Safari drops list semantics from a <ul> styled with list-style: none. */}
        <ul className="frog-library-page-grid" role="list" aria-labelledby={headingId}>
          {entries.map((entry) => (
            <li key={entry.id} className="frog-library-page-item">
              <FrogCard entry={entry} full heart />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
