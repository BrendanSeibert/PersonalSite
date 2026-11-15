import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { FrogCard } from './FrogCard';
import { FROG_ENTRIES, type FrogEntry } from './frogEntries';

const entry: FrogEntry = FROG_ENTRIES[1]; // "Dolor sit amet", tone "meadow"

function renderCard(props: Partial<Parameters<typeof FrogCard>[0]> = {}) {
  const { container } = renderWithProviders(<FrogCard entry={entry} {...props} />, { withRouter: false });
  return container.firstElementChild as HTMLElement;
}

describe('FrogCard', () => {
  it('draws a static card with its title, an empty image slot and its tone', () => {
    const card = renderCard();
    expect(screen.getByText('Dolor sit amet')).toBeInTheDocument();
    expect(card.querySelector('.frog-card-image-empty')).not.toBeNull();
    expect(card.querySelector('img')).toBeNull();
    expect(card).toHaveClass(`frog-card-tone-${entry.tone}`);
    expect(screen.queryByRole('button')).toBeNull();
    expect(card.querySelector('.frog-card-blurb')).toBeNull();
    expect(card).toHaveAttribute('data-expanded', 'false');
  });

  it('shows a decorative image when the entry has one', () => {
    const card = renderCard({ entry: { ...entry, image: '/test.png' } });
    const image = card.querySelector('img')!;
    expect(image).toHaveAttribute('src', '/test.png');
    expect(image).toHaveAttribute('alt', '');
    expect(card.querySelector('.frog-card-image-empty')).toBeNull();
  });

  it('is a collapsed disclosure button when expandable and closed', () => {
    renderCard({ expansion: { expanded: false, onActivate: vi.fn(), blurbId: 'blurb' } });
    const face = screen.getByRole('button', { name: 'Dolor sit amet' });
    expect(face).toHaveAttribute('type', 'button');
    expect(face).toHaveAttribute('aria-expanded', 'false');
    expect(face).toHaveAttribute('aria-controls', 'blurb');
    const blurb = document.getElementById('blurb')!;
    expect(blurb.textContent).toMatch(/^Sed cursus ante dapibus diam/);
    expect(blurb).not.toBeVisible();
  });

  it('shows the description when expanded', () => {
    const card = renderCard({ expansion: { expanded: true, onActivate: vi.fn(), blurbId: 'blurb' } });
    expect(screen.getByRole('button', { name: 'Dolor sit amet' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/^Sed cursus ante dapibus diam/)).toBeVisible();
    expect(card).toHaveAttribute('data-expanded', 'true');
  });

  it('calls onActivate when the face is clicked, not the description', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    renderCard({ expansion: { expanded: true, onActivate, blurbId: 'blurb' } });
    await user.click(screen.getByRole('button', { name: 'Dolor sit amet' }));
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(onActivate.mock.calls[0][0]).toHaveProperty('type', 'click');
    await user.click(screen.getByText(/^Sed cursus ante dapibus diam/));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('has the convention classes', () => {
    const card = renderCard();
    expect(card).toHaveClass('d-frog-card', 'frog-card');
  });
});
