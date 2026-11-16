import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('puts the heading, intro and status line in the main column', async () => {
    renderWithProviders(<HomePage />);
    const main = within(screen.getByRole('main'));
    expect(main.getByRole('heading', { name: 'Hello, world' })).toBeInTheDocument();
    expect(main.getByText(/this is my corner of the web/)).toBeInTheDocument();
    expect(await main.findByText('API ok, database up')).toBeInTheDocument();
  });

  it('puts the frog spinner under its "Frog Spinner" heading, in the aside of the same name', async () => {
    renderWithProviders(<HomePage />);
    const left = within(screen.getByRole('complementary', { name: 'Frog Spinner' }));
    expect(left.getByRole('heading', { name: 'Frog Spinner' })).toBeInTheDocument();
    expect(left.getByRole('button', { name: 'Get a frog' })).toBeInTheDocument();
    expect(left.getByRole('status')).toHaveTextContent('Press the button to get a frog.');
    expect(left.queryByText('Coming soon.')).toBeNull();
    await screen.findByText('API ok, database up');
  });

  it('shows the landed card in the "Frog Spinner" aside, not in main', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<HomePage />);
    await screen.findByText('API ok, database up');
    const aside = screen.getByRole('complementary', { name: 'Frog Spinner' });
    await user.click(within(aside).getByRole('button', { name: 'Get a frog' }));
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
    await screen.findByText('API ok, database up');
  });

  it('keeps every piece of content inside one of the three columns', async () => {
    const { container } = renderWithProviders(<HomePage />);
    await screen.findByText('API ok, database up');
    const layout = container.querySelector('.column-layout')!;
    expect(layout.children).toHaveLength(3);
    // The layout root holds no text of its own: everything sits inside a column.
    for (const node of layout.childNodes) expect(node.nodeType).toBe(Node.ELEMENT_NODE);
    expect(container.children).toHaveLength(1);
  });
});
