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

  it('puts "Highlights" and the frog spinner in the aside named "Highlights"', async () => {
    renderWithProviders(<HomePage />);
    const left = within(screen.getByRole('complementary', { name: 'Highlights' }));
    expect(left.getByRole('heading', { name: 'Highlights' })).toBeInTheDocument();
    expect(left.getByRole('button', { name: 'Get a frog' })).toBeInTheDocument();
    expect(left.getByRole('status')).toHaveTextContent('Press the button to get a frog.');
    expect(left.queryByText('Coming soon.')).toBeNull();
    await screen.findByText('API ok, database up');
  });

  it('shows the landed card in the "Highlights" aside, not in main', async () => {
    const user = userEvent.setup();
    const { container } = renderWithProviders(<HomePage />);
    await screen.findByText('API ok, database up');
    const aside = screen.getByRole('complementary', { name: 'Highlights' });
    await user.click(within(aside).getByRole('button', { name: 'Get a frog' }));
    fireEvent.transitionEnd(container.querySelector('.frog-spinner-strip')!);
    const landed = within(aside).getByRole('status').textContent!.match(/^You got: (.+?)\. /)![1];
    expect(within(aside).getByRole('button', { name: landed })).toBeInTheDocument();
    expect(within(screen.getByRole('main')).queryByRole('button', { name: landed })).toBeNull();
  });

  it('puts "Get in touch" and its body in the aside named "Get in touch"', async () => {
    renderWithProviders(<HomePage />);
    const right = within(screen.getByRole('complementary', { name: 'Get in touch' }));
    expect(right.getByRole('heading', { name: 'Get in touch' })).toBeInTheDocument();
    expect(right.getByText('Coming soon.')).toBeInTheDocument();
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
