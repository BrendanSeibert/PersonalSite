import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../routes';
import { routesWithPage } from '../test/renderApp';
import { MODE_STORAGE_KEY } from '../components/FavoritesPanel';
import { seedFavorites } from '../test/favoritesFake';
import { renderWithProviders } from '../test/renderWithProviders';
import en from './en.json';
import type { Dictionary } from './translate';
import { waitForHomeToSettle } from '../test/settle';

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

function renderMarkedUp(url: string, dictionary: Dictionary = markUp(en)) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  return renderWithProviders(<RouterProvider router={router} />, { withRouter: false, dictionary });
}

afterEach(() => {
  vi.restoreAllMocks();
  document.title = '';
  document.documentElement.lang = '';
});

it('the error page, shown when a page throws, takes every string from en.json too', async () => {
  function Boom(): never {
    throw new Error('boom');
  }
  vi.spyOn(console, 'error').mockImplementation(() => {}); // React logs the caught error
  const router = createMemoryRouter(routesWithPage({ path: 'boom', element: <Boom /> }), {
    initialEntries: ['/boom'],
  });
  renderWithProviders(<RouterProvider router={router} />, { withRouter: false, dictionary: markUp(en) });
  await screen.findByText('⟦error.body⟧');

  expect(findHardcodedText()).toEqual([]);
  expect(document.title).toBe('⟦app.pageTitle⟧');
});

it.each([
  ['/', '⟦favorites.mine.empty⟧'],
  ['/frog-library', '⟦frogLibrary.heading⟧'],
  ['/about', '⟦about.heading⟧'],
  ['/does-not-exist', '⟦notFound.heading⟧'],
])('every visible string on %s comes from en.json', async (url, settledText) => {
  renderMarkedUp(url);
  await screen.findByText(settledText); // wait for async content such as the favorites panel

  expect(findHardcodedText()).toEqual([]);
  // The tab title too: only the site name on Home, the page-title format elsewhere.
  expect(document.title).toMatch(MARKED);
  expect(document.title).toBe(url === '/' ? '⟦app.title⟧' : '⟦app.pageTitle⟧');
});

it('the links in the About Me section take their words from en.json too', async () => {
  // The marked-up contact sentence has no placeholders, so its links would not render at all.
  // Keep the placeholders here, so the resume, LinkedIn and GitHub words are checked as well.
  const dictionary = markUp(en);
  const middle = (dictionary.home as Dictionary).middle as Dictionary;
  middle.contact = '⟦home.middle.contact⟧ {resume} {linkedIn} {gitHub}';
  renderMarkedUp('/', dictionary);
  await waitForHomeToSettle('⟦favorites.loading⟧');

  expect(
    // (jsdom drops the space before the hidden new-tab warning; a real browser keeps it.)
    screen.getAllByRole('link', { name: /^⟦home\.middle\.(resume|linkedIn|gitHub)⟧( ?⟦link\.newTab(Pdf)?⟧)?$/ }),
  ).toHaveLength(3);
  // The new-tab warnings come from en.json too.
  expect(screen.getByRole('link', { name: /^⟦home\.middle\.resume⟧ ?⟦link\.newTabPdf⟧$/ })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /^⟦home\.middle\.gitHub⟧ ?⟦link\.newTab⟧$/ })).toBeInTheDocument();
  expect(findHardcodedText()).toEqual([]);
});

it('the source link on the About page takes its text from en.json too', async () => {
  const dictionary = markUp(en);
  (dictionary.about as Dictionary).source = '⟦about.source⟧ {url}';
  renderMarkedUp('/about', dictionary);
  await screen.findByText('⟦about.heading⟧');

  expect(screen.getByRole('link', { name: /^⟦about\.sourceUrl⟧ ?⟦link\.newTab⟧$/ })).toBeInTheDocument();
  expect(findHardcodedText()).toEqual([]);
});

it('the GitHub link and the loopback label on the About page take their words from en.json too', async () => {
  // Without their placeholders the marked-up sentences would drop these elements entirely.
  const dictionary = markUp(en);
  const about = dictionary.about as Dictionary;
  about.lead = '⟦about.lead⟧ {gitHub}';
  (about.loop as Dictionary).loopback = '{label} ⟦about.loop.loopback⟧';
  renderMarkedUp('/about', dictionary);
  await screen.findByText('⟦about.heading⟧');

  expect(screen.getByRole('link', { name: /^⟦about\.gitHub⟧ ?⟦link\.newTab⟧$/ })).toBeInTheDocument();
  expect(screen.getByText('⟦about.loop.loopbackLabel⟧').tagName).toBe('STRONG');
  expect(findHardcodedText()).toEqual([]);
});

it('every string on / comes from en.json after a spin, with the landed card open', async () => {
  const user = userEvent.setup();
  const { container } = renderMarkedUp('/');
  await waitForHomeToSettle('⟦favorites.loading⟧');

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
    await waitForHomeToSettle('⟦favorites.loading⟧');
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
