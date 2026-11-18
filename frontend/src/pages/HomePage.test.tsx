import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { EMAIL_ADDRESS, GITHUB_URL, LINKEDIN_URL, RESUME_URL } from './contactLinks';
import { HomePage } from './HomePage';
import { waitForHomeToSettle } from '../test/settle';

// The PDFs in frontend/public, read as text: enough to check one is there and starts like a PDF.
const PUBLIC_PDFS = import.meta.glob<string>('/public/*.pdf', { query: '?raw', import: 'default', eager: true });

// A new-tab link's accessible name: its word, then the hidden warning. jsdom's name computation
// trims the hidden span's leading space ("here(PDF, …)"), which a real browser keeps, so the space
// is optional here; the span's own text is checked for it, and a11y.browser.test.tsx checks the
// exact name in Chromium.
const newTabName = (word: string, pdf = false) =>
  new RegExp(`^${word} ?\\(${pdf ? 'PDF, ' : ''}opens in a new tab\\)$`);

describe('HomePage', () => {
  it('names its one <main> "Home" and leaves the tab title as the site name', async () => {
    renderWithProviders(<HomePage />);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main', { name: 'Home' })).toBeInTheDocument();
    expect(document.title).toBe('Brendan Seibert');
    await waitForHomeToSettle();
  });

  it('warns a screen reader that the new-tab links open a new tab, and the resume is a PDF', async () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByRole('link', { name: newTabName('my resume', true) })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: newTabName('LinkedIn') })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: newTabName('GitHub') })).toBeInTheDocument();
    const hiddenTexts = screen.getByRole('main').querySelectorAll('a .visually-hidden');
    expect(hiddenTexts).toHaveLength(3);
    for (const hidden of hiddenTexts) {
      expect(hidden.textContent).toMatch(/^ \((PDF, )?opens in a new tab\)$/); // a leading space
    }
    expect(screen.getByRole('link', { name: 'email me' })).toHaveAccessibleName('email me'); // a mail app, not a tab
    await waitForHomeToSettle();
  });

  it('puts the About Me heading and both paragraphs in the main column, with no status line', async () => {
    renderWithProviders(<HomePage />);
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('heading', { name: 'About Me' })).toBeInTheDocument();
    expect(main.getByText(/amateur frog enthusiast with 28\+ years experience/)).toBeInTheDocument();
    expect(main.getByText(/Here’s/)).toBeInTheDocument();
    expect(main.queryByRole('status')).toBeNull();
    expect(screen.queryByText(/API ok|API unavailable|Checking\.\.\./)).toBeNull();
    await waitForHomeToSettle();
  });

  it('links the words "email me" with mailto:, without the address showing', async () => {
    renderWithProviders(<HomePage />);
    expect(EMAIL_ADDRESS).toBe('brendanseibertmail@gmail.com');
    const email = screen.getByRole('link', { name: 'email me' });
    expect(email).toHaveAttribute('href', 'mailto:brendanseibertmail@gmail.com');
    expect(email).not.toHaveAttribute('target');
    expect(screen.getByRole('main').textContent).not.toContain('brendanseibertmail@gmail.com');
    await waitForHomeToSettle();
  });

  it('links the words "my resume" to the resume PDF that ships with the site, in a new tab', async () => {
    renderWithProviders(<HomePage />);
    const link = screen.getByRole('link', { name: newTabName('my resume', true) });
    expect(link).toHaveAttribute('href', '/Brendan-Seibert-Resume.pdf');
    expect(link).toHaveAttribute('href', RESUME_URL);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    // Vite copies frontend/public into the build as is, so the file must be there and be a PDF.
    expect(Object.keys(PUBLIC_PDFS)).toContain(`/public${RESUME_URL}`);
    expect(PUBLIC_PDFS[`/public${RESUME_URL}`]!.startsWith('%PDF-')).toBe(true);
    await waitForHomeToSettle();
  });

  it.each([
    ['LinkedIn', LINKEDIN_URL, 'https://www.linkedin.com/in/brendan-seibert'],
    ['GitHub', GITHUB_URL, 'https://github.com/BrendanSeibert'],
  ])('links the word %s to the profile, in a new tab, without the URL showing', async (name, constant, url) => {
    renderWithProviders(<HomePage />);
    expect(constant).toBe(url);
    const link = screen.getByRole('link', { name: newTabName(name) });
    expect(link).toHaveAttribute('href', url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.queryByText(new RegExp(url.replace(/[.]/g, '\\.')))).toBeNull(); // the word, not the URL
    await waitForHomeToSettle();
  });

  it('keeps the contact sentence whole around its links', async () => {
    renderWithProviders(<HomePage />);
    const paragraph = screen.getByRole('link', { name: /^GitHub/ }).closest('p')!.cloneNode(true) as HTMLElement;
    // What is drawn: the new-tab warnings are for screen readers only (tested above).
    for (const hidden of paragraph.querySelectorAll('.visually-hidden')) hidden.remove();
    expect(paragraph.textContent).toBe(
      'Here’s my resume, or you can email me directly. I’m also on LinkedIn, and you can check out the ' +
        'code for this site on my GitHub.',
    );
    await waitForHomeToSettle();
  });

  it('puts the frog spinner under its "Frog Spinner" heading, in the aside of the same name', async () => {
    renderWithProviders(<HomePage />);
    const left = within(screen.getByRole('complementary', { name: 'Frog Spinner' }));
    expect(left.getByRole('heading', { name: 'Frog Spinner' })).toBeInTheDocument();
    expect(left.getByRole('button', { name: 'Spin the wheel' })).toBeInTheDocument();
    expect(left.getByRole('status')).toHaveTextContent('Press Spin the wheel to get a random frog.');
    expect(left.queryByText('Coming soon.')).toBeNull();
    await waitForHomeToSettle();
  });

  it('shows the landed card in the "Frog Spinner" aside, not in main', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<HomePage />);
    await waitForHomeToSettle();
    const aside = screen.getByRole('complementary', { name: 'Frog Spinner' });
    await user.click(within(aside).getByRole('button', { name: 'Spin the wheel' }));
    fireEvent.transitionEnd(container.querySelector('.frog-spinner-strip')!);
    const landed = within(aside).getByRole('status').textContent!.match(/^You got: (.+?)\. /)![1];
    expect(within(aside).getByRole('button', { name: landed })).toBeInTheDocument();
    expect(within(screen.getByRole('main')).queryByRole('button', { name: landed })).toBeNull();
  });

  it('puts the favorites panel in the aside named "Favorites", where "Get in touch" was', async () => {
    renderWithProviders(<HomePage />);
    const right = within(screen.getByRole('complementary', { name: 'Favorites' }));
    expect(right.getByRole('heading', { level: 2, name: 'Favorites' })).toHaveClass('visually-hidden'); // the tabs are the header
    const tablist = right.getByRole('tablist', { name: 'Favorites' });
    expect(within(tablist).getByRole('tab', { name: 'Your Favorites' })).toHaveAttribute('aria-selected', 'true');
    expect(within(tablist).getByRole('tab', { name: 'All Time Favorites' })).toHaveAttribute('aria-selected', 'false');
    expect(right.queryByRole('switch')).toBeNull();
    expect(await right.findByText(/No favorites yet/)).toBeInTheDocument();
    expect(screen.queryByText('Get in touch')).toBeNull();
    expect(screen.queryByText('Coming soon.')).toBeNull();
    await waitForHomeToSettle();
  });

  it('keeps every piece of content inside one of the three columns', async () => {
    const { container } = renderWithProviders(<HomePage />);
    await waitForHomeToSettle();
    const layout = container.querySelector('.column-layout')!;
    expect(layout.children).toHaveLength(3);
    // The layout root holds no text of its own: everything sits inside a column.
    for (const node of layout.childNodes) expect(node.nodeType).toBe(Node.ELEMENT_NODE);
    expect(container.children).toHaveLength(1);
  });
});
