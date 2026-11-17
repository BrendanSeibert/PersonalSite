import { screen, waitFor } from '@testing-library/react';
import { expect } from 'vitest';

// The home page has settled once the favorites panel has finished loading: by then every request
// it starts on its own has answered, so nothing updates after the test ends.
export async function waitForHomeToSettle(loadingText = 'Loading favorites...') {
  await screen.findAllByRole('complementary'); // the page has rendered
  await waitFor(() => expect(screen.queryByText(loadingText)).toBeNull());
}
