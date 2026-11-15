import { act, fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import en from '../i18n/en.json';
import { translate } from '../i18n/translate';
import { renderWithProviders } from '../test/renderWithProviders';
import { FROG_ENTRIES, type FrogEntry } from './frogEntries';
import { REPEATS, spinOffset } from './frogReel';
import { FrogSpinner } from './FrogSpinner';

const titles = FROG_ENTRIES.map((entry) => translate(en, entry.titleKey));
const PROMPT = 'Press the button to get a frog.';
const DOLOR_BLURB = /^Sed cursus ante dapibus diam/;

type Options = Parameters<typeof FrogSpinner>[0];

function renderSpinner(props: Options = { random: () => 0 }) {
  const { container } = renderWithProviders(
    <>
      <h2>Outside heading</h2>
      <FrogSpinner {...props} />
    </>,
    { withRouter: false },
  );
  const root = container.querySelector('.frog-spinner') as HTMLElement;
  const strip = container.querySelector('.frog-spinner-strip') as HTMLElement;
  return { root, strip, container };
}

const button = () => screen.getByRole('button', { name: 'Get a frog' });
const status = () => screen.getByRole('status');
const offset = (strip: HTMLElement) => strip.style.getPropertyValue('--frog-spinner-offset');
const cardButton = (name = 'Dolor sit amet') => screen.getByRole('button', { name });
const pick = () => document.querySelector('.frog-spinner-pick') as HTMLElement;
const isOpen = (name = 'Dolor sit amet') => cardButton(name).getAttribute('aria-expanded') === 'true';

async function spinAndLand(user: ReturnType<typeof userEvent.setup>, strip: HTMLElement) {
  await user.click(button());
  fireEvent.transitionEnd(strip);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FrogSpinner', () => {
  it('starts idle: prompt, decorative strip on the first entry, no landed card', () => {
    const { strip, container } = renderSpinner();
    expect(button()).toHaveAttribute('type', 'button');
    expect(button()).toHaveAttribute('aria-disabled', 'false');
    expect(status()).toHaveTextContent(PROMPT);
    expect(container.querySelector('.frog-spinner-window')).toHaveAttribute('aria-hidden', 'true');
    const rows = strip.querySelectorAll('.frog-spinner-row');
    expect(rows).toHaveLength(20 * REPEATS);
    rows.forEach((row, index) => expect(row).toHaveTextContent(titles[index % 20]));
    expect(offset(strip)).toBe('20');
    expect(screen.queryByRole('button', { name: 'Lorem ipsum' })).toBeNull();
  });

  it('starts a spin on click', async () => {
    const user = userEvent.setup();
    const { strip } = renderSpinner();
    await user.click(button());
    expect(status()).toHaveTextContent('Spinning...');
    expect(button()).toHaveAttribute('aria-disabled', 'true');
    expect(strip).toHaveClass('frog-spinner-strip-spinning');
    expect(offset(strip)).toBe(String(spinOffset(1, 20)));
    expect(offset(strip)).toBe('61');
    expect(screen.queryByRole('button', { name: 'Dolor sit amet' })).toBeNull();
  });

  it('ignores clicks during a spin', async () => {
    const user = userEvent.setup();
    const random = vi.fn(() => 0);
    const { strip } = renderSpinner({ random });
    await user.click(button());
    await user.click(button());
    expect(offset(strip)).toBe('61');
    expect(random).toHaveBeenCalledTimes(1);
  });

  it('lands: announces the entry and shows it as a collapsed card', async () => {
    const user = userEvent.setup();
    const { strip } = renderSpinner();
    await spinAndLand(user, strip);
    expect(status()).toHaveTextContent('You got: Dolor sit amet. Tap or hover over the card to read more.');
    expect(button()).toHaveAttribute('aria-disabled', 'false');
    expect(strip).not.toHaveClass('frog-spinner-strip-spinning');
    expect(offset(strip)).toBe('21');
    expect(cardButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText(DOLOR_BLURB)).not.toBeVisible();
  });

  it("counts only the strip's own transition", async () => {
    const user = userEvent.setup();
    const { strip } = renderSpinner();
    fireEvent.transitionEnd(strip); // idle: nothing happens
    expect(status()).toHaveTextContent(PROMPT);
    expect(offset(strip)).toBe('20');

    await user.click(button());
    fireEvent.transitionEnd(strip.querySelector('.frog-card')!);
    expect(status()).toHaveTextContent('Spinning...');
    expect(strip).toHaveClass('frog-spinner-strip-spinning');
  });

  it('opens on mouse hover and closes on unhover', async () => {
    const user = userEvent.setup();
    const { strip } = renderSpinner();
    await spinAndLand(user, strip);
    await user.hover(cardButton());
    expect(isOpen()).toBe(true);
    expect(screen.getByText(DOLOR_BLURB)).toBeVisible();
    await user.unhover(cardButton());
    expect(isOpen()).toBe(false);
  });

  describe('touch', () => {
    it('opens on a tap, and stays open after the finger leaves', async () => {
      const user = userEvent.setup();
      const { strip } = renderSpinner();
      await spinAndLand(user, strip);
      await user.pointer({ keys: '[TouchA]', target: cardButton() });
      expect(isOpen()).toBe(true);
      fireEvent.pointerLeave(pick(), { pointerType: 'touch' });
      expect(isOpen()).toBe(true);
    });

    it('keeps it open on a second tap, and on a tap on the description', async () => {
      const user = userEvent.setup();
      const { strip } = renderSpinner();
      await spinAndLand(user, strip);
      await user.pointer({ keys: '[TouchA]', target: cardButton() });
      await user.pointer({ keys: '[TouchA]', target: cardButton() });
      expect(isOpen()).toBe(true);
      await user.pointer({ keys: '[TouchA]', target: screen.getByText(DOLOR_BLURB) });
      expect(isOpen()).toBe(true);
    });

    it('does not open when a touch on the card turns into a scroll (a touch "hover" is ignored)', async () => {
      const user = userEvent.setup();
      const { strip } = renderSpinner();
      await spinAndLand(user, strip);
      // What a phone sends when a finger lands on the card and then scrolls: no click.
      fireEvent.pointerOver(cardButton(), { pointerType: 'touch' });
      fireEvent.pointerDown(cardButton(), { pointerType: 'touch' });
      fireEvent.pointerCancel(cardButton(), { pointerType: 'touch' });
      fireEvent.pointerOut(cardButton(), { pointerType: 'touch' });
      expect(isOpen()).toBe(false);
    });

    it('closes on a tap outside', async () => {
      const user = userEvent.setup();
      const { strip } = renderSpinner();
      await spinAndLand(user, strip);
      await user.pointer({ keys: '[TouchA]', target: cardButton() });
      await user.pointer({ keys: '[TouchA]', target: screen.getByRole('heading', { name: 'Outside heading' }) });
      expect(isOpen()).toBe(false);
    });

    it('stays open when a touch outside turns into a scroll (no click)', async () => {
      const user = userEvent.setup();
      const { strip } = renderSpinner();
      await spinAndLand(user, strip);
      await user.pointer({ keys: '[TouchA]', target: cardButton() });
      const heading = screen.getByRole('heading', { name: 'Outside heading' });
      fireEvent.pointerDown(heading, { pointerType: 'touch' });
      fireEvent.pointerCancel(heading, { pointerType: 'touch' });
      expect(isOpen()).toBe(true);
    });
  });

  it('pins on click: stays open after unhover, closes on a second click', async () => {
    const user = userEvent.setup();
    const { strip } = renderSpinner();
    await spinAndLand(user, strip);
    await user.click(cardButton());
    expect(isOpen()).toBe(true);
    await user.unhover(cardButton());
    expect(isOpen()).toBe(true);
    await user.click(cardButton());
    expect(isOpen()).toBe(false);
  });

  it('closes on a click outside, whether pinned or hovered', async () => {
    const user = userEvent.setup();
    const { strip } = renderSpinner();
    await spinAndLand(user, strip);
    const heading = screen.getByRole('heading', { name: 'Outside heading' });

    await user.click(cardButton());
    expect(isOpen()).toBe(true);
    await user.click(heading);
    expect(isOpen()).toBe(false);

    await user.hover(cardButton());
    expect(isOpen()).toBe(true);
    // Dispatched directly: user.click would first move the mouse off the card and unhover it.
    fireEvent.pointerDown(heading, { pointerType: 'mouse' });
    fireEvent.click(heading);
    expect(isOpen()).toBe(false);
  });

  it('stays open when a drag starts inside and ends in a click outside', async () => {
    const user = userEvent.setup();
    const { strip, root } = renderSpinner();
    await spinAndLand(user, strip);
    await user.click(cardButton());
    fireEvent.pointerDown(screen.getByText(DOLOR_BLURB), { pointerType: 'mouse' });
    fireEvent.click(root);
    expect(isOpen()).toBe(true);
  });

  describe('focus', () => {
    it('closes when focus moves out with Tab or Shift+Tab', async () => {
      const user = userEvent.setup();
      const { strip } = renderSpinner();
      await spinAndLand(user, strip);

      act(() => cardButton().focus());
      await user.keyboard('{Enter}');
      expect(isOpen()).toBe(true);
      await user.tab();
      expect(button()).toHaveFocus();
      expect(isOpen()).toBe(false);

      act(() => cardButton().focus());
      await user.keyboard('{Enter}');
      expect(isOpen()).toBe(true);
      await user.tab({ shift: true });
      expect(cardButton()).not.toHaveFocus();
      expect(isOpen()).toBe(false);
    });

    it('closes a hover-opened card when focus leaves', async () => {
      const user = userEvent.setup();
      const { strip } = renderSpinner();
      await spinAndLand(user, strip);
      await user.hover(cardButton());
      act(() => cardButton().focus());
      expect(isOpen()).toBe(true);
      await user.tab();
      expect(isOpen()).toBe(false);
    });

    it('stays open when focus moves within the card, or the window loses focus', async () => {
      const user = userEvent.setup();
      const { strip } = renderSpinner();
      await spinAndLand(user, strip);
      await user.click(cardButton());
      const blurb = screen.getByText(DOLOR_BLURB);
      fireEvent.focusOut(cardButton(), { relatedTarget: blurb });
      expect(isOpen()).toBe(true);

      vi.spyOn(document, 'hasFocus').mockReturnValue(false);
      fireEvent.focusOut(cardButton(), { relatedTarget: null });
      expect(isOpen()).toBe(true);
    });
  });

  it('works from the keyboard and never loses focus', async () => {
    const user = userEvent.setup();
    const { strip } = renderSpinner();
    await user.tab();
    expect(button()).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(status()).toHaveTextContent('Spinning...');
    expect(button()).toHaveFocus();
    fireEvent.transitionEnd(strip);
    expect(button()).toHaveFocus();

    await user.tab({ shift: true });
    expect(cardButton()).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(isOpen()).toBe(true);
    await user.keyboard(' ');
    expect(isOpen()).toBe(false);
    await user.keyboard('{Enter}');
    expect(isOpen()).toBe(true);
    await user.keyboard('{Escape}');
    expect(isOpen()).toBe(false);
    expect(cardButton()).toHaveFocus();
  });

  it('removes its outside listeners when the card closes', async () => {
    const user = userEvent.setup();
    const { strip } = renderSpinner();
    await spinAndLand(user, strip);
    const remove = vi.spyOn(document, 'removeEventListener');

    await user.click(cardButton());
    await user.click(cardButton()); // closed
    expect(remove).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    expect(remove).toHaveBeenCalledWith('click', expect.any(Function), true);

    // A click anywhere after closing leaves the closed card alone.
    await user.click(screen.getByRole('heading', { name: 'Outside heading' }));
    expect(isOpen()).toBe(false);
  });

  it('removes its outside listeners on unmount', async () => {
    const user = userEvent.setup();
    const result = renderWithProviders(<FrogSpinner random={() => 0} />, { withRouter: false });
    const strip = result.container.querySelector('.frog-spinner-strip') as HTMLElement;
    await spinAndLand(user, strip);
    await user.click(cardButton());
    const remove = vi.spyOn(document, 'removeEventListener');
    result.unmount();
    expect(remove).toHaveBeenCalledWith('pointerdown', expect.any(Function), true);
    expect(remove).toHaveBeenCalledWith('click', expect.any(Function), true);
  });

  it('scrolls a pinned card into view, but never on hover', async () => {
    const user = userEvent.setup();
    const scroll = vi.spyOn(Element.prototype, 'scrollIntoView');
    const { strip } = renderSpinner();
    await spinAndLand(user, strip);
    await user.hover(cardButton());
    expect(isOpen()).toBe(true);
    expect(scroll).not.toHaveBeenCalled();
    await user.click(cardButton()); // hovered → pinned
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith({ block: 'nearest' });
  });

  it('closes the card on a new spin', async () => {
    const user = userEvent.setup();
    const { strip } = renderSpinner();
    await spinAndLand(user, strip);
    await user.click(cardButton());
    expect(isOpen()).toBe(true);
    await user.click(button());
    expect(screen.queryByRole('button', { name: 'Dolor sit amet' })).toBeNull();
    fireEvent.transitionEnd(strip);
    expect(isOpen('Lorem ipsum')).toBe(false);
  });

  it('keeps an open card open while a press outside is held, so the layout does not jump under it', async () => {
    const user = userEvent.setup();
    const { strip } = renderSpinner();
    await spinAndLand(user, strip);
    act(() => cardButton().focus());
    await user.keyboard('{Enter}');
    expect(isOpen()).toBe(true);

    // Mouse down on "Get a frog" moves focus off the card, but the card stays open until the click.
    await user.pointer({ keys: '[MouseLeft>]', target: button() });
    expect(button()).toHaveFocus();
    expect(isOpen()).toBe(true);
    await user.pointer({ keys: '[/MouseLeft]', target: button() });
    expect(status()).toHaveTextContent('Spinning...');
  });

  it('never lands on the same entry twice in a row', async () => {
    const user = userEvent.setup();
    const { strip } = renderSpinner();
    for (const title of ['Dolor sit amet', 'Lorem ipsum', 'Dolor sit amet']) {
      await spinAndLand(user, strip);
      expect(status()).toHaveTextContent(`You got: ${title}.`);
    }
  });

  it('accepts custom entries', async () => {
    const user = userEvent.setup();
    const entries: FrogEntry[] = [
      { ...FROG_ENTRIES[0] },
      { ...FROG_ENTRIES[1], image: '/test.png' },
    ];
    const { strip } = renderSpinner({ entries, random: () => 0 });
    expect(strip.querySelectorAll('.frog-spinner-row')).toHaveLength(2 * REPEATS);
    await spinAndLand(user, strip);
    expect(pick().querySelector('img')).toHaveAttribute('src', '/test.png');
  });

  it('uses Math.random by default', async () => {
    const user = userEvent.setup();
    const { strip } = renderSpinner({});
    await spinAndLand(user, strip);
    const landed = titles.find((title) => status().textContent?.includes(`You got: ${title}.`));
    expect(landed).toBeDefined();
    expect(landed).not.toBe('Lorem ipsum');
  });

  it('has the convention classes', () => {
    const { root } = renderSpinner();
    expect(root).toHaveClass('d-frog-spinner', 'frog-spinner');
  });
});
