import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { favoriteRequests } from '../test/favoritesFake';
import { renderWithProviders } from '../test/renderWithProviders';
import { ExpandableFrogCard } from './ExpandableFrogCard';
import { FROG_ENTRIES } from './frogEntries';

const entry = FROG_ENTRIES[1]; // "Dolor sit amet"
const face = () => screen.getByRole('button', { name: 'Dolor sit amet' });
const heart = () => screen.getByRole('button', { name: 'Favorite Dolor sit amet' });
const isOpen = () => face().getAttribute('aria-expanded') === 'true';
const ready = () => waitFor(() => expect(heart()).toHaveAttribute('aria-disabled', 'false'));

describe('ExpandableFrogCard', () => {
  it('wraps a disclosure card: the face controls the description, and the wrapper takes the class', () => {
    const { container } = renderWithProviders(<ExpandableFrogCard entry={entry} className="probe" />, {
      withRouter: false,
    });
    expect(container.firstElementChild).toHaveClass('probe');
    const blurb = document.getElementById(face().getAttribute('aria-controls')!)!;
    expect(blurb).toHaveClass('frog-card-blurb');
    expect(blurb).not.toBeVisible();
    expect(screen.queryByRole('button', { name: /^Favorite/ })).toBeNull(); // no heart unless asked
  });

  it('runs whileOpen with the wrapper while the card is open, and its cleanup when it closes', async () => {
    const user = userEvent.setup();
    const cleanup = vi.fn();
    const whileOpen = vi.fn((wrapper: HTMLDivElement) => {
      // Already open in the DOM, in the same commit, before anything scrolls it into view.
      expect(wrapper.querySelector('.frog-card')).toHaveAttribute('data-expanded', 'true');
      return cleanup;
    });
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { container } = renderWithProviders(<ExpandableFrogCard entry={entry} whileOpen={whileOpen} />, {
      withRouter: false,
    });
    expect(whileOpen).not.toHaveBeenCalled();
    await user.click(face());
    expect(whileOpen).toHaveBeenCalledExactlyOnceWith(container.firstElementChild);
    expect(whileOpen.mock.invocationCallOrder[0]).toBeLessThan(scroll.mock.invocationCallOrder[0]);
    expect(cleanup).not.toHaveBeenCalled();
    await user.click(face());
    expect(cleanup).toHaveBeenCalledTimes(1);
    scroll.mockRestore();
  });

  it('puts the heart and count inside the wrapper, and pressing the heart never opens or closes the card', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<ExpandableFrogCard entry={entry} heart likes={3} />, {
      withRouter: false,
    });
    await ready();
    expect(container.firstElementChild!.contains(heart())).toBe(true);
    expect(container.querySelector('.frog-card-likes')).toHaveTextContent('3');

    await user.click(heart()); // mouse, closed
    expect(isOpen()).toBe(false);
    await user.pointer({ keys: '[TouchA]', target: heart() }); // touch, closed
    expect(isOpen()).toBe(false);

    await user.click(face()); // open it
    expect(isOpen()).toBe(true);
    await user.click(heart()); // mouse, open
    expect(isOpen()).toBe(true);
    act(() => heart().focus());
    await user.keyboard('{Enter}'); // keyboard, open
    expect(isOpen()).toBe(true);
    await waitFor(() => expect(favoriteRequests).toHaveLength(4));
  });

  it('stays open when Tab moves from the face to the heart, and closes when focus leaves', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ExpandableFrogCard entry={entry} heart />
        <button type="button">After</button>
      </>,
      { withRouter: false },
    );
    act(() => face().focus());
    await user.keyboard('{Enter}');
    await user.tab();
    expect(heart()).toHaveFocus();
    expect(isOpen()).toBe(true);
    await user.tab();
    expect(isOpen()).toBe(false);
    fireEvent.keyDown(face(), { key: 'a' }); // other keys do nothing
    expect(isOpen()).toBe(false);
  });
});
