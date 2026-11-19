import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../i18n/en.json';
import { translate } from '../i18n/translate';
import { answerFavorites, seedFavorites } from '../test/favoritesFake';
import { renderWithProviders } from '../test/renderWithProviders';
import { server } from '../test/server';
import { FavoriteButton } from './FavoriteButton';
import { FavoritesPanel, MODE_STORAGE_KEY } from './FavoritesPanel';
import { FROG_ENTRIES } from './frogEntries';
import { MINE_KEY } from './useFavorite';

const MINE = 'Your Favorites';
const ALL_TIME = 'All Time Favorites';

const title = (i: number) => translate(en, FROG_ENTRIES[i].titleKey);
const tab = (name: string) => screen.getByRole('tab', { name });
const tabpanel = (name: string) => screen.findByRole('tabpanel', { name });
// The list has no name of its own: it is found inside the tabpanel its tab names.
const list = async (name: string) => within(await tabpanel(name)).findByRole('list');
const cardNames = (listEl: HTMLElement) =>
  within(listEl)
    .getAllByRole('listitem')
    .map((item) => item.querySelector('.frog-card-title')!.textContent);
const face = (name: string) => screen.getByRole('button', { name });
const heart = (name: string) => screen.getByRole('button', { name: `Favorite ${name}` });
const isOpen = (name: string) => face(name).getAttribute('aria-expanded') === 'true';
const expectSelected = (name: string) => {
  const other = name === MINE ? ALL_TIME : MINE;
  expect(tab(name)).toHaveAttribute('aria-selected', 'true');
  expect(tab(name)).toHaveAttribute('tabindex', '0');
  expect(tab(other)).toHaveAttribute('aria-selected', 'false');
  expect(tab(other)).toHaveAttribute('tabindex', '-1');
};

function renderPanel(extra?: ReactNode) {
  return renderWithProviders(
    <>
      <FavoritesPanel />
      {extra}
    </>,
    { withRouter: false },
  );
}

// Counts requests for the All Time list, answering from the shared fake as usual.
function countTopRequests() {
  const counter = { count: 0 };
  server.use(
    http.get('/api/favorites/top', ({ request }) => {
      counter.count += 1;
      return answerFavorites('GET', request.url);
    }),
  );
  return counter;
}

afterEach(() => vi.restoreAllMocks());

describe('FavoritesPanel', () => {
  it('keeps one "Favorites" heading for screen readers only, first in the panel, in both tabs', async () => {
    const { container } = renderPanel();
    const heading = screen.getByRole('heading', { level: 2, name: 'Favorites' });
    expect(container.querySelector('.favorites-panel')!.firstElementChild).toBe(heading);
    expect(heading).toHaveClass('visually-hidden'); // the tabs are the visible header
    expect(screen.queryByRole('switch')).toBeNull();
    await userEvent.setup().click(tab(ALL_TIME));
    expect(screen.getAllByRole('heading', { level: 2 })).toEqual([
      screen.getByRole('heading', { level: 2, name: 'Favorites' }),
    ]);
  });

  it('makes the tabs the header: a tablist named by the hidden heading, with Your Favorites selected', () => {
    renderPanel();
    const heading = screen.getByRole('heading', { level: 2, name: 'Favorites' });
    const tablist = screen.getByRole('tablist', { name: 'Favorites' });
    expect(tablist).toHaveAttribute('aria-labelledby', heading.id);
    expect(heading.nextElementSibling).toBe(tablist); // nothing visible comes before the tabs
    expect(within(tablist).getAllByRole('tab').map((el) => el.textContent)).toEqual([MINE, ALL_TIME]);
    expectSelected(MINE);
    for (const name of [MINE, ALL_TIME]) expect(tab(name)).toHaveAttribute('type', 'button');
  });

  it('gives each tab its own tabpanel; only the selected one is shown, focusable and filled', async () => {
    seedFavorites({ mine: ['entry01'] });
    const { container } = renderPanel();
    for (const name of [MINE, ALL_TIME]) {
      const panel = document.getElementById(tab(name).getAttribute('aria-controls')!)!;
      expect(panel).toHaveAttribute('role', 'tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', tab(name).id);
    }
    const hidden = document.getElementById(tab(ALL_TIME).getAttribute('aria-controls')!)!;
    expect(hidden).toHaveAttribute('hidden');
    expect(hidden).toBeEmptyDOMElement();
    expect(hidden).not.toHaveAttribute('tabindex');

    const shown = await tabpanel(MINE);
    expect(shown).toHaveAttribute('tabindex', '0');
    const listEl = await list(MINE);
    expect(listEl.tagName).toBe('UL');
    expect(listEl).toHaveAttribute('role', 'list');
    expect(listEl).not.toHaveAttribute('aria-labelledby');
    expect(listEl).not.toHaveAttribute('aria-label');
    expect(container.querySelectorAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1);
  });

  it('shows your favorites as collapsed cards in en.json order, hearts pressed', async () => {
    seedFavorites({ mine: ['entry07', 'entry02'] });
    renderPanel();
    const listEl = await list(MINE);
    expect(cardNames(listEl)).toEqual([title(1), title(6)]);
    for (const name of [title(1), title(6)]) {
      expect(isOpen(name)).toBe(false);
      await waitFor(() => expect(heart(name)).toHaveAttribute('aria-pressed', 'true'));
    }
    expect(within(listEl).getByText(/^Anaxyrus americanus\./)).not.toBeVisible();
  });

  it('opens and closes its cards like the spinner, one at a time, and the heart never toggles them', async () => {
    seedFavorites({ mine: ['entry01', 'entry02'] });
    const user = userEvent.setup();
    renderPanel();
    await list(MINE);
    await user.click(face(title(0)));
    expect(isOpen(title(0))).toBe(true);
    expect(screen.getByText(/^Acris crepitans\./)).toBeVisible();
    await user.click(face(title(1)));
    expect(isOpen(title(0))).toBe(false);
    expect(isOpen(title(1))).toBe(true);
    await user.keyboard('{Escape}');
    expect(isOpen(title(1))).toBe(false);

    await user.click(face(title(1)));
    await waitFor(() => expect(heart(title(1))).toHaveAttribute('aria-disabled', 'false'));
    await user.click(heart(title(1)));
    expect(isOpen(title(1))).toBe(true);
  });

  it('keeps an unliked card when you re-click the open tab, and drops it when you switch tabs', async () => {
    seedFavorites({ mine: ['entry07'] });
    const user = userEvent.setup();
    renderPanel();
    await list(MINE);
    await waitFor(() => expect(heart(title(6))).toHaveAttribute('aria-pressed', 'true'));
    await user.click(heart(title(6)));
    await waitFor(() => expect(heart(title(6))).toHaveAttribute('aria-pressed', 'false'));
    expect(cardNames(await list(MINE))).toEqual([title(6)]); // still there, heart empty

    await user.click(tab(MINE)); // the open tab: nothing changes
    expect(cardNames(await list(MINE))).toEqual([title(6)]);

    await user.click(tab(ALL_TIME));
    await user.click(tab(MINE));
    expect(await screen.findByText(en.favorites.mine.empty)).toBeInTheDocument();
  });

  it('adds a frog liked elsewhere on the page without a reload', async () => {
    const user = userEvent.setup();
    renderPanel(<FavoriteButton entry={FROG_ENTRIES[4]} />);
    expect(await screen.findByText(en.favorites.mine.empty)).toBeInTheDocument();
    const outsideHeart = heart(title(4));
    await waitFor(() => expect(outsideHeart).toHaveAttribute('aria-disabled', 'false'));
    await user.click(outsideHeart);
    expect(cardNames(await list(MINE))).toEqual([title(4)]);
  });

  it('switches to All Time Favorites on click: the top ten, ranked, with counts seen and spoken', async () => {
    // Frogs 1..12 get 1..12 likes; you liked frog 12.
    seedFavorites({
      mine: ['entry12'],
      counts: Object.fromEntries(FROG_ENTRIES.slice(0, 12).map((e, i) => [e.id, i + 1])),
    });
    const top = countTopRequests();
    const user = userEvent.setup();
    renderPanel();
    await list(MINE);
    expect(top.count).toBe(0); // All Time is fetched only once it is shown
    await user.click(tab(ALL_TIME));
    expectSelected(ALL_TIME);

    const listEl = await list(ALL_TIME);
    expect(top.count).toBe(1);
    expect(listEl.tagName).toBe('OL');
    expect(cardNames(listEl)).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map(title));
    const first = within(listEl).getAllByRole('listitem')[0];
    expect(first.querySelector('.frog-card-likes [aria-hidden="true"]')!.textContent).toBe('12');
    expect(first.querySelector('.frog-card-likes .visually-hidden')).toHaveTextContent('12 likes');
    await waitFor(() => expect(heart(title(11))).toHaveAttribute('aria-pressed', 'true'));
    expect(heart(title(10))).toHaveAttribute('aria-pressed', 'false');
  });

  it('moves between the tabs with the arrow keys, wrapping, and selects the one it moves to', async () => {
    const user = userEvent.setup();
    renderPanel();
    tab(MINE).focus();
    await user.keyboard('{ArrowRight}');
    expect(tab(ALL_TIME)).toHaveFocus();
    expectSelected(ALL_TIME);
    await user.keyboard('{ArrowRight}');
    expect(tab(MINE)).toHaveFocus();
    expectSelected(MINE);
    await user.keyboard('{ArrowLeft}');
    expect(tab(ALL_TIME)).toHaveFocus();
    expectSelected(ALL_TIME);
    await user.keyboard('{ArrowLeft}');
    expect(tab(MINE)).toHaveFocus();
    expectSelected(MINE);
  });

  it('jumps to the last tab with End and the first with Home', async () => {
    const user = userEvent.setup();
    renderPanel();
    tab(MINE).focus();
    await user.keyboard('{End}');
    expect(tab(ALL_TIME)).toHaveFocus();
    expectSelected(ALL_TIME);
    await user.keyboard('{Home}');
    expect(tab(MINE)).toHaveFocus();
    expectSelected(MINE);
  });

  it('ignores other keys, and prevents the default only for the four it handles', async () => {
    const user = userEvent.setup();
    renderPanel();
    tab(MINE).focus();
    await user.keyboard('{Enter}[Space]{ArrowDown}{ArrowUp}');
    expectSelected(MINE);
    expect(tab(MINE)).toHaveFocus();
    // fireEvent returns false when the handler called preventDefault.
    for (const key of ['ArrowDown', 'ArrowUp', 'Enter', ' ', 'a']) {
      expect(fireEvent.keyDown(tab(MINE), { key }), key).toBe(true);
    }
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End']) {
      expect(fireEvent.keyDown(document.activeElement!, { key }), key).toBe(false);
    }
  });

  it('tabs from the selected tab to the panel, then to the first card', async () => {
    seedFavorites({ mine: ['entry01', 'entry02'] });
    const user = userEvent.setup();
    renderPanel();
    const listEl = await list(MINE);
    tab(MINE).focus();
    await user.tab();
    expect(await tabpanel(MINE)).toHaveFocus();
    await user.tab();
    expect(face(title(0))).toHaveFocus();
    expect(listEl).toContainElement(face(title(0)));
    await user.tab({ shift: true });
    await user.tab({ shift: true });
    expect(tab(MINE)).toHaveFocus();
  });

  it('tabs from the selected tab to the panel when it shows a message, then out of the panel', async () => {
    const user = userEvent.setup();
    renderPanel(<button type="button">after</button>);
    await screen.findByText(en.favorites.mine.empty);
    tab(MINE).focus();
    await user.tab();
    expect(await tabpanel(MINE)).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus();
  });

  it('keeps focus on the panel when its list arrives while it has focus', async () => {
    seedFavorites({ mine: ['entry01'] });
    let release = () => {};
    server.use(
      http.get('/api/favorites/mine', async ({ request }) => {
        await new Promise<void>((resolve) => (release = resolve));
        return answerFavorites('GET', request.url);
      }),
    );
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText('Loading favorites...');
    tab(MINE).focus();
    await user.tab();
    const panel = await tabpanel(MINE);
    expect(panel).toHaveFocus();
    act(() => release());
    await list(MINE);
    expect(panel).toHaveAttribute('tabindex', '0');
    expect(panel).toHaveFocus();
  });

  it('says "1 like" for a single like, and updates a count after your own like', async () => {
    seedFavorites({ counts: { entry03: 1 } });
    const user = userEvent.setup();
    renderPanel();
    await user.click(tab(ALL_TIME));
    const listEl = await list(ALL_TIME);
    expect(listEl.querySelector('.frog-card-likes .visually-hidden')!.textContent).toBe('1 like');
    await waitFor(() => expect(heart(title(2))).toHaveAttribute('aria-disabled', 'false'));
    await user.click(heart(title(2)));
    await waitFor(() => expect(listEl.querySelector('.frog-card-likes .visually-hidden')).toHaveTextContent('2 likes'));
  });

  it('remembers the selected tab in this browser', async () => {
    const user = userEvent.setup();
    const first = renderPanel();
    await user.click(tab(ALL_TIME));
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBe('allTime');
    first.unmount();
    renderPanel();
    expectSelected(ALL_TIME);
    await user.click(tab(MINE));
    expect(localStorage.getItem(MODE_STORAGE_KEY)).toBeNull();
  });

  it('falls back to Your Favorites, without errors, when storage is blocked', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const user = userEvent.setup();
    renderPanel();
    expectSelected(MINE);
    await user.click(tab(ALL_TIME)); // still works for this visit
    expectSelected(ALL_TIME);
  });

  it.each([
    [MINE, false, '/api/favorites/mine'],
    [ALL_TIME, true, '/api/favorites/top'],
  ])('%s: shows loading, then its empty message, or the error message, in its tabpanel', async (name, allTime, url) => {
    if (allTime) localStorage.setItem(MODE_STORAGE_KEY, 'allTime');
    let release = () => {};
    server.use(
      http.get(url, async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json(allTime ? { top: [] } : { entryIds: [] });
      }),
    );
    const first = renderPanel();
    expect(within(await tabpanel(name)).getByText('Loading favorites...')).toBeInTheDocument();
    act(() => release());
    const empty = allTime ? en.favorites.allTime.empty : en.favorites.mine.empty;
    expect(await within(await tabpanel(name)).findByText(empty)).toBeInTheDocument();
    first.unmount();

    server.use(http.get(url, () => new HttpResponse(null, { status: 500 })));
    renderPanel();
    expect(
      await within(await tabpanel(name)).findByText('Favorites are unavailable right now.'),
    ).toBeInTheDocument();
  });

  it('disables the hearts when your favorites are unavailable', async () => {
    localStorage.setItem(MODE_STORAGE_KEY, 'allTime');
    seedFavorites({ counts: { entry01: 2 } });
    server.use(http.get('/api/favorites/mine', () => new HttpResponse(null, { status: 500 })));
    const { queryClient } = renderPanel();
    await list(ALL_TIME);
    await waitFor(() => expect(queryClient.getQueryState(MINE_KEY)?.status).toBe('error'));
    expect(heart(title(0))).toHaveAttribute('aria-disabled', 'true');
  });

  it('skips a top frog it has no card for (it is checked by the API client too)', async () => {
    localStorage.setItem(MODE_STORAGE_KEY, 'allTime');
    seedFavorites({ counts: { entry01: 2, entry02: 1 } });
    renderWithProviders(<FavoritesPanel entries={[FROG_ENTRIES[1]]} />, { withRouter: false });
    expect(cardNames(await list(ALL_TIME))).toEqual([title(1)]);
  });

  it('has the convention classes', () => {
    const { container } = renderPanel();
    expect(container.firstElementChild).toHaveClass('d-favorites-panel', 'favorites-panel');
  });
});
