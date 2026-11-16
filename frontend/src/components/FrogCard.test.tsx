import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import en from '../i18n/en.json';
import { renderWithProviders } from '../test/renderWithProviders';
import { FrogCard } from './FrogCard';
import { FROG_ENTRIES, type FrogEntry } from './frogEntries';

const entry: FrogEntry = FROG_ENTRIES[1]; // "Dolor sit amet", tone "sage"

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

  it('draws a concealed card as a skeleton, with no title or picture', () => {
    const card = renderCard({ entry: { ...entry, image: '/test.png' }, concealed: true });
    expect(card.textContent).toBe('');
    expect(card.querySelector('img')).toBeNull();
    expect(card.querySelector('.frog-card-image-concealed')).not.toBeNull();
    expect(card.querySelector('.frog-card-title-concealed')).not.toBeNull();
    expect(card).toHaveClass(`frog-card-tone-${entry.tone}`);
    expect(card).toHaveAttribute('data-entry-id', entry.id);
  });

  it('has the convention classes', () => {
    const card = renderCard();
    expect(card).toHaveClass('d-frog-card', 'frog-card');
  });

  describe('full (the Frog Library card)', () => {
    it('is an always-open article with an <h3> title and the description, and nothing to click', () => {
      const card = renderCard({ full: true });
      expect(card.tagName).toBe('ARTICLE');
      expect(card).toHaveClass('d-frog-card', 'frog-card', 'frog-card-full', `frog-card-tone-${entry.tone}`);
      expect(card).toHaveAttribute('data-entry-id', entry.id);
      expect(screen.getByRole('heading', { level: 3, name: 'Dolor sit amet' })).toBeInTheDocument();
      const blurb = card.querySelector('.frog-card-blurb')!;
      expect(blurb.textContent).toMatch(/^Sed cursus ante dapibus diam/);
      expect(blurb).toBeVisible();
      expect(screen.queryByRole('button')).toBeNull();
      expect(card.querySelector('[aria-expanded]')).toBeNull();
    });

    it('has no expansion state, so the landed card’s floating rules never apply', () => {
      const card = renderCard({ full: true });
      expect(card).not.toHaveAttribute('data-expanded');
    });

    it('shows a decorative image when the entry has one', () => {
      const card = renderCard({ entry: { ...entry, image: '/test.png' }, full: true });
      const image = card.querySelector('img')!;
      expect(image).toHaveAttribute('src', '/test.png');
      expect(image).toHaveAttribute('alt', '');
      expect(card.querySelector('.frog-card-image-empty')).toBeNull();
    });

    it('shows the empty image slot when the entry has no image', () => {
      const card = renderCard({ full: true });
      expect(card.querySelector('img')).toBeNull();
      expect(card.querySelector('.frog-card-image-empty')).not.toBeNull();
    });

    it('cannot be combined with concealed or expansion (checked by the compiler)', () => {
      // @ts-expect-error: `full` and `concealed` together are meaningless, so the props forbid it.
      const bad = <FrogCard entry={entry} full concealed />;
      expect(bad).toBeTruthy();
    });
  });

  describe('heart and likes (the corner)', () => {
    const expansion = { expanded: false, onActivate: () => {}, blurbId: 'blurb' };

    it.each([
      ['full', { full: true as const }],
      ['static', {}],
      ['expandable', { expansion }],
    ])('puts the heart in the corner of a %s card, a sibling of the face, never inside it', (_kind, props) => {
      const card = renderCard({ ...props, heart: true });
      const heart = screen.getByRole('button', { name: 'Favorite Dolor sit amet' });
      const face = card.querySelector('.frog-card-face')!;
      expect(card.lastElementChild).toHaveClass('frog-card-corner');
      expect(card.lastElementChild!.contains(heart)).toBe(true);
      expect(face.contains(heart)).toBe(false);
    });

    it('has no corner without heart', () => {
      const card = renderCard({ expansion });
      expect(card.querySelector('.frog-card-corner')).toBeNull();
      expect(screen.queryByRole('button', { name: /^Favorite/ })).toBeNull();
    });

    it.each([
      [1, '1', '1 like'],
      [12, '12', '12 likes'],
      [0, '0', '0 likes'],
    ])('shows likes=%i as "%s", spoken as "%s"', (likes, visible, spoken) => {
      const card = renderCard({ expansion, heart: true, likes });
      const count = card.querySelector('.frog-card-likes')!;
      const [shown, hidden] = [...count.children];
      expect(shown).toHaveTextContent(visible);
      expect(shown).toHaveAttribute('aria-hidden', 'true');
      expect(hidden).toHaveTextContent(spoken);
      expect(hidden).toHaveClass('visually-hidden');
      expect(count.nextElementSibling).toHaveClass('favorite-button'); // count first, then the heart
    });

    it('falls back to English plural rules when the page language is not a real locale', () => {
      const dictionary = { ...en, app: { ...en.app, lang: 'not a locale!' } };
      const { container } = renderWithProviders(<FrogCard entry={entry} expansion={expansion} heart likes={1} />, {
        withRouter: false,
        dictionary,
      });
      expect(container.querySelector('.frog-card-likes .visually-hidden')).toHaveTextContent('1 like');
    });

    it('never has a heart on a concealed reel card (checked by the compiler)', () => {
      // @ts-expect-error: a concealed card has no title and spins, so it can't take a heart.
      const bad = <FrogCard entry={entry} concealed heart />;
      expect(bad).toBeTruthy();
      const card = renderCard({ concealed: true });
      expect(card.querySelector('.frog-card-corner')).toBeNull();
    });
  });
});
