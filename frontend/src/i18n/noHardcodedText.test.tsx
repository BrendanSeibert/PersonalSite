import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { routes } from '../routes';
import { MODE_STORAGE_KEY } from '../components/FavoritesPanel';
import { seedFavorites } from '../test/favoritesFake';
import { renderWithProviders } from '../test/renderWithProviders';
import en from './en.json';
import type { Dictionary } from './translate';

// A copy of the dictionary where every value is its own key in brackets, e.g. ⟦navbar.home⟧.
// Any visible text that is not in brackets did not come from the dictionary.
function markUp(node: Dictionary, path: string[] = []): Dictionary {
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [
      key,
      typeof value === 'string' ? `⟦${[...path, key].join('.')}⟧` : markUp(value, [...path, key]),
    ]),
  );
}

const MARKED = /^(\s*⟦[\w.]+⟧\s*)+$/;
const TEXT_ATTRIBUTES = ['aria-label', 'title', 'alt', 'placeholder'];

// Every text node and text attribute in the page that did not come from the dictionary.
function findHardcodedText(): string[] {
  const offenders: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (text && !MARKED.test(text)) offenders.push(`text: "${text}"`);
  }
  for (const element of document.body.querySelectorAll('*')) {
    for (const attribute of TEXT_ATTRIBUTES) {
      const value = element.getAttribute(attribute);
      if (value && !MARKED.test(value)) offenders.push(`${attribute}: "${value}"`);
    }
  }
  return offenders;
}

function renderMarkedUp(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  return renderWithProviders(<RouterProvider router={router} />, { withRouter: false, dictionary: markUp(en) });
}

afterEach(() => {
  document.documentElement.lang = '';
});

it.each([
  ['/', '⟦health.ok⟧'],
  ['/frog-library', '⟦frogLibrary.heading⟧'],
  ['/about', '⟦about.heading⟧'],
  ['/does-not-exist', '⟦notFound.heading⟧'],
])('every visible string on %s comes from en.json', async (url, settledText) => {
  renderMarkedUp(url);
  await screen.findByText(settledText); // wait for async content such as the health check

  expect(findHardcodedText()).toEqual([]);
  expect(document.title).toBe('⟦app.title⟧');
});

it('every string on / comes from en.json after a spin, with the landed card open', async () => {
  const user = userEvent.setup();
  const { container } = renderMarkedUp('/');
  await screen.findByText('⟦health.ok⟧');

  await user.click(screen.getByRole('button', { name: '⟦frogSpinner.button⟧' }));
  fireEvent.transitionEnd(container.querySelector('.frog-spinner-strip')!);
  const card = container.querySelector<HTMLButtonElement>('.frog-spinner-pick .frog-card-face')!;
  await user.click(card);

  expect(card).toHaveAttribute('aria-expanded', 'true');
  expect(container.querySelector('.frog-card-blurb')).toBeVisible();
  expect(container.querySelector('.frog-spinner-result')).toHaveTextContent('⟦frogSpinner.result⟧');
  expect(findHardcodedText()).toEqual([]);
});

describe('with favorites', () => {
  // Every heart's name, the panel's heading, the tabs and the counts come from en.json too.
  it.each([
    ['Your Favorites', false, '⟦favorites.mine.tab⟧'],
    ['All Time Favorites (counts shown and spoken)', true, '⟦favorites.allTime.tab⟧'],
  ])('every string on / comes from en.json in %s', async (_mode, allTime, selectedTab) => {
    seedFavorites({ mine: ['entry02', 'entry07'], counts: { entry02: 1, entry07: 12, entry03: 4 } });
    if (allTime) localStorage.setItem(MODE_STORAGE_KEY, 'allTime');
    const { container } = renderMarkedUp('/');
    await screen.findByText('⟦health.ok⟧');
    await screen.findByRole('heading', { name: '⟦favorites.label⟧' });
    expect(screen.getAllByRole('tab').map((el) => el.textContent)).toEqual([
      '⟦favorites.mine.tab⟧',
      '⟦favorites.allTime.tab⟧',
    ]);
    expect(screen.getByRole('tab', { name: selectedTab })).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(container.querySelectorAll('.favorites-panel-item')).toHaveLength(allTime ? 3 : 2));
    if (allTime) {
      expect(container.querySelector('.frog-card-likes [aria-hidden="true"]')!.textContent).toBe('⟦favorites.countShort⟧');
      expect([...container.querySelectorAll('.frog-card-likes .visually-hidden')].map((e) => e.textContent)).toEqual([
        '⟦favorites.likes.other⟧',
        '⟦favorites.likes.other⟧',
        '⟦favorites.likes.one⟧',
      ]);
    }
    for (const heart of container.querySelectorAll('.favorite-button')) {
      expect(heart).toHaveAttribute('aria-label', '⟦favorites.toggle⟧');
    }
    expect(findHardcodedText()).toEqual([]);
  });

  it('every string on /frog-library comes from en.json, with a heart pressed', async () => {
    seedFavorites({ mine: ['entry05'] });
    const { container } = renderMarkedUp('/frog-library');
    await waitFor(() => expect(container.querySelector('.favorite-button[aria-pressed="true"]')).not.toBeNull());
    expect(findHardcodedText()).toEqual([]);
  });
});
