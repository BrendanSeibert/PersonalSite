import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { ExpandableFrogCard } from './ExpandableFrogCard';
import { FROG_ENTRIES } from './frogEntries';

// The spinner's open and close rules, now in useCardExpansion, against two bare cards.
function renderCards() {
  renderWithProviders(
    <>
      <button type="button">Outside</button>
      <ExpandableFrogCard entry={FROG_ENTRIES[0]} />
      <ExpandableFrogCard entry={FROG_ENTRIES[1]} />
    </>,
    { withRouter: false },
  );
}
const face = (name = 'Eastern Cricket Frog') => screen.getByRole('button', { name });
const isOpen = (name = 'Eastern Cricket Frog') => face(name).getAttribute('aria-expanded') === 'true';
const outside = () => screen.getByRole('button', { name: 'Outside' });
const wrapper = (name = 'Eastern Cricket Frog') => face(name).closest('.frog-card')!.parentElement!;

afterEach(() => vi.restoreAllMocks());

describe('useCardExpansion', () => {
  it('starts closed and opens only on purpose, never on hover', async () => {
    const user = userEvent.setup();
    renderCards();
    expect(isOpen()).toBe(false);
    await user.hover(face());
    expect(isOpen()).toBe(false);
  });

  it('opens on a tap and stays open on a second tap (touch always opens)', async () => {
    const user = userEvent.setup();
    renderCards();
    await user.pointer({ keys: '[TouchA]', target: face() });
    expect(isOpen()).toBe(true);
    await user.pointer({ keys: '[TouchA]', target: face() });
    expect(isOpen()).toBe(true);
  });

  it('toggles with the mouse and with Enter or Space', async () => {
    const user = userEvent.setup();
    renderCards();
    await user.click(face());
    expect(isOpen()).toBe(true);
    await user.click(face());
    expect(isOpen()).toBe(false);
    act(() => face().focus());
    await user.keyboard('{Enter}');
    expect(isOpen()).toBe(true);
    await user.keyboard(' ');
    expect(isOpen()).toBe(false);
  });

  it('closes on Escape, keeping focus on the face', async () => {
    const user = userEvent.setup();
    renderCards();
    await user.click(face());
    await user.keyboard('{Escape}');
    expect(isOpen()).toBe(false);
    expect(face()).toHaveFocus();
  });

  it('closes on a click outside, but not on a drag that started inside', async () => {
    const user = userEvent.setup();
    renderCards();
    await user.click(face());
    fireEvent.pointerDown(face(), { pointerType: 'mouse' });
    fireEvent.click(document.body);
    expect(isOpen()).toBe(true);
    await user.click(outside());
    expect(isOpen()).toBe(false);
  });

  it('closes this card when another expandable card is clicked, so one is open at a time', async () => {
    const user = userEvent.setup();
    renderCards();
    await user.click(face('Eastern Cricket Frog'));
    await user.click(face('Eastern American Toad'));
    expect(isOpen('Eastern Cricket Frog')).toBe(false);
    expect(isOpen('Eastern American Toad')).toBe(true);
  });

  it('closes when focus leaves by keyboard, but not when it moves within, or the window loses focus', async () => {
    const user = userEvent.setup();
    renderCards();
    await user.click(face());
    fireEvent.focusOut(face(), { relatedTarget: wrapper() });
    expect(isOpen()).toBe(true);
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    fireEvent.focusOut(face(), { relatedTarget: null });
    expect(isOpen()).toBe(true);
    vi.restoreAllMocks();
    await user.tab();
    expect(isOpen()).toBe(false);
  });

  it('stays open while a press outside is held, so nothing jumps under the pointer', async () => {
    const user = userEvent.setup();
    renderCards();
    act(() => face().focus());
    await user.keyboard('{Enter}');
    await user.pointer({ keys: '[MouseLeft>]', target: outside() });
    expect(outside()).toHaveFocus();
    expect(isOpen()).toBe(true);
    await user.pointer({ keys: '[/MouseLeft]', target: outside() });
    expect(isOpen()).toBe(false);
  });

  it('stays open when a touch outside turns into a scroll (no click)', async () => {
    const user = userEvent.setup();
    renderCards();
    await user.pointer({ keys: '[TouchA]', target: face() });
    fireEvent.pointerDown(outside(), { pointerType: 'touch' });
    fireEvent.pointerCancel(outside(), { pointerType: 'touch' });
    expect(isOpen()).toBe(true);
  });

  it('scrolls an opened card into view', async () => {
    const user = userEvent.setup();
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
    renderCards();
    await user.click(face());
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('stops reacting to outside presses once closed', async () => {
    const user = userEvent.setup();
    renderCards();
    await user.click(face());
    await user.click(face());
    expect(isOpen()).toBe(false);
    fireEvent.pointerDown(document.body, { pointerType: 'mouse' });
    fireEvent.pointerUp(document.body, { pointerType: 'mouse' });
    fireEvent.click(document.body);
    fireEvent.pointerCancel(document.body, { pointerType: 'touch' });
    expect(isOpen()).toBe(false);
    // Re-open: Escape must still close it, so a press was not left stuck as "held".
    await user.click(face());
    expect(isOpen()).toBe(true);
    await user.keyboard('{Escape}');
    expect(isOpen()).toBe(false);
  });

  it('removes all four document listeners when it closes', async () => {
    const user = userEvent.setup();
    renderCards();
    await user.click(face());
    const remove = vi.spyOn(document, 'removeEventListener');
    await user.click(face());
    for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'click']) {
      expect(remove).toHaveBeenCalledWith(type, expect.any(Function), true);
    }
  });

  it('makes the wrapper focusable by script and pointer only', () => {
    renderCards();
    expect(wrapper()).toHaveAttribute('tabIndex', '-1');
  });
});
