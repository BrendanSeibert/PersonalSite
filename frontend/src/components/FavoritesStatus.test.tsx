import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { answerFavorites } from '../test/favoritesFake';
import { renderWithProviders } from '../test/renderWithProviders';
import { server } from '../test/server';
import { FavoriteButton } from './FavoriteButton';
import { FavoritesStatus } from './FavoritesStatus';
import { FROG_ENTRIES } from './frogEntries';

function renderWithHeart() {
  renderWithProviders(
    <>
      <FavoriteButton entry={FROG_ENTRIES[0]} />
      <FavoritesStatus />
    </>,
    { withRouter: false },
  );
  return screen.getByRole('button', { name: 'Favorite Eastern Cricket Frog' });
}

describe('FavoritesStatus', () => {
  it('announces nothing at first, in a visually hidden status region', () => {
    renderWithHeart();
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    expect(status).toHaveClass('visually-hidden');
  });

  it('announces a failed save, and clears it after the next one succeeds', async () => {
    let fail = true;
    server.use(
      http.all('/api/favorites/entry01', ({ request }) =>
        fail ? new HttpResponse(null, { status: 500 }) : answerFavorites(request.method, request.url),
      ),
    );
    const user = userEvent.setup();
    const heart = renderWithHeart();
    await waitFor(() => expect(heart).toHaveAttribute('aria-disabled', 'false'));

    await user.click(heart);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent("Couldn't save your favorite. Please try again."));
    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'false')); // rolled back

    fail = false;
    await act(() => user.click(heart));
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(''));
    expect(heart).toHaveAttribute('aria-pressed', 'true');
  });
});
