import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FROG_ENTRIES, type FrogEntry } from '../components/frogEntries';
import en from '../i18n/en.json';
import { translate } from '../i18n/translate';
import { renderWithProviders } from '../test/renderWithProviders';
import { FrogLibraryPage } from './FrogLibraryPage';

const items = () => within(screen.getByRole('list', { name: 'Frog Library' })).getAllByRole('listitem');

describe('FrogLibraryPage', () => {
  it('is the main landmark, focusable by script only, with the heading and the intro', () => {
    renderWithProviders(<FrogLibraryPage />);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('tabIndex', '-1');
    expect(within(main).getByRole('heading', { level: 2, name: 'Frog Library' })).toBeInTheDocument();
    expect(within(main).getByText(en.frogLibrary.intro)).toBeInTheDocument();
  });

  it('lists every frog from the spinner’s source, in order, fully open', () => {
    renderWithProviders(<FrogLibraryPage />);
    const listItems = items();
    expect(listItems).toHaveLength(FROG_ENTRIES.length);
    expect(FROG_ENTRIES.length).toBe(20);

    listItems.forEach((item, i) => {
      const entry = FROG_ENTRIES[i];
      const article = item.querySelector('article')!;
      expect(article).toHaveAttribute('data-entry-id', entry.id);
      expect(within(item).getByRole('heading', { level: 3 })).toHaveTextContent(translate(en, entry.titleKey));
      expect(article.querySelector('.frog-card-blurb')).toHaveTextContent(translate(en, entry.blurbKey));
    });
  });

  it('gives each frog the same tone it has on the spinner', () => {
    renderWithProviders(<FrogLibraryPage />);
    items().forEach((item, i) => {
      expect(item.querySelector('article')).toHaveClass(`frog-card-tone-${FROG_ENTRIES[i].tone}`);
    });
  });

  it('has nothing to click', () => {
    renderWithProviders(<FrogLibraryPage />);
    const list = screen.getByRole('list', { name: 'Frog Library' });
    expect(within(list).queryAllByRole('button')).toHaveLength(0);
    expect(within(list).queryAllByRole('link')).toHaveLength(0);
  });

  it('renders the entries it is given', () => {
    const entries: FrogEntry[] = [
      { ...FROG_ENTRIES[0], image: '/test.png' },
      FROG_ENTRIES[1],
    ];
    renderWithProviders(<FrogLibraryPage entries={entries} />);
    const listItems = items();
    expect(listItems).toHaveLength(2);
    expect(listItems[0].querySelector('img')).toHaveAttribute('src', '/test.png');
    expect(listItems[1].querySelector('img')).toBeNull();
  });

  it('has the colour and layout classes on its root', () => {
    renderWithProviders(<FrogLibraryPage />);
    expect(screen.getByRole('main')).toHaveClass('d-frog-library-page', 'frog-library-page');
  });
});
