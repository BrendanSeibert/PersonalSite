import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { favoriteRequests, seedFavorites } from '../test/favoritesFake';
import { renderWithProviders } from '../test/renderWithProviders';
import { server } from '../test/server';
import { FavoriteButton } from './FavoriteButton';
import { FROG_ENTRIES } from './frogEntries';

const entry = FROG_ENTRIES[1]; // "Eastern American Toad", entry02

function renderHeart() {
  renderWithProviders(<FavoriteButton entry={entry} />, { withRouter: false });
  return screen.getByRole('button', { name: 'Favorite Eastern American Toad' });
}
const ready = (heart: HTMLElement) => waitFor(() => expect(heart).toHaveAttribute('aria-disabled', 'false'));

describe('FavoriteButton', () => {
  it('is a toggle button named after its frog, with a decorative heart', async () => {
    const heart = renderHeart();
    expect(heart).toHaveAttribute('type', 'button');
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    expect(heart).toHaveClass('d-favorite-button', 'favorite-button');
    const svg = heart.querySelector('svg')!;
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('focusable', 'false');
    await ready(heart);
  });

  it('toggles with a click: pressed and a PUT, then not pressed and a DELETE', async () => {
    const user = userEvent.setup();
    const heart = renderHeart();
    await ready(heart);
    await user.click(heart);
    expect(heart).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(favoriteRequests).toEqual(['PUT entry02']));
    await user.click(heart);
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(favoriteRequests).toEqual(['PUT entry02', 'DELETE entry02']));
  });

  it('toggles with Enter and Space', async () => {
    const user = userEvent.setup();
    const heart = renderHeart();
    await ready(heart);
    act(() => heart.focus());
    await user.keyboard('{Enter}');
    expect(heart).toHaveAttribute('aria-pressed', 'true');
    await user.keyboard(' ');
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(favoriteRequests).toEqual(['PUT entry02', 'DELETE entry02']));
  });

  it('is aria-disabled and does nothing while your favorites load', async () => {
    server.use(http.get('/api/favorites/mine', async () => {
      await delay('infinite');
      return HttpResponse.json({ entryIds: [] });
    }));
    const user = userEvent.setup();
    const heart = renderHeart();
    expect(heart).toHaveAttribute('aria-disabled', 'true');
    await user.click(heart);
    expect(heart).toHaveAttribute('aria-pressed', 'false');
    expect(favoriteRequests).toEqual([]);
  });

  it('starts pressed for a frog you favorited before', async () => {
    seedFavorites({ mine: ['entry02'] });
    const heart = renderHeart();
    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'true'));
  });
});
