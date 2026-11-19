import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeMatchMedia } from '../test/matchMedia';
import { renderWithProviders } from '../test/renderWithProviders';
import { ThemeToggle } from './ThemeToggle';

afterEach(() => vi.unstubAllGlobals());

function renderToggle(prefersDark = false) {
  vi.stubGlobal('matchMedia', fakeMatchMedia(prefersDark));
  renderWithProviders(<ThemeToggle />);
  return screen.getByRole('switch', { name: 'Dark mode' });
}

describe('ThemeToggle', () => {
  it('is a switch named "Dark mode"', () => {
    const toggle = renderToggle();
    expect(toggle.tagName).toBe('BUTTON');
    expect(toggle).toHaveAccessibleName('Dark mode');
  });

  it('is off on a light browser', () => {
    expect(renderToggle(false)).toHaveAttribute('aria-checked', 'false');
  });

  it('is on for a dark browser', () => {
    expect(renderToggle(true)).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('a click flips aria-checked, <html data-theme> and localStorage, and keeps the name', async () => {
    const user = userEvent.setup();
    const toggle = renderToggle(false);
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(localStorage.getItem('ex3.theme')).toBe('dark');
    expect(toggle).toHaveAccessibleName('Dark mode');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(localStorage.getItem('ex3.theme')).toBe('light');
  });

  it.each([
    ['Space', ' '],
    ['Enter', '{Enter}'],
  ])('%s toggles it', async (_name, key) => {
    const user = userEvent.setup();
    const toggle = renderToggle(false);
    toggle.focus();
    await user.keyboard(key);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('hides the icons from assistive technology', () => {
    const toggle = renderToggle();
    const track = toggle.querySelector('.theme-toggle-track');
    expect(track).toHaveAttribute('aria-hidden', 'true');
    expect(track?.querySelectorAll('svg')).toHaveLength(2);
  });

  it('ignores a hostile stored value and follows the browser', () => {
    localStorage.setItem('ex3.theme', '<img src=x onerror=alert(1)>');
    const toggle = renderToggle(true);
    expect(toggle).toHaveAttribute('aria-checked', 'true');
    expect(document.querySelector('img')).toBeNull();
  });
});
