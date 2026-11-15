import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ColumnLayout } from './ColumnLayout';

function renderLayout() {
  return render(
    <ColumnLayout
      middle={<p>middle content</p>}
      left={<p>left content</p>}
      right={<p>right content</p>}
      leftLabel="Left side"
      rightLabel="Right side"
    />,
  );
}

describe('ColumnLayout', () => {
  it('writes the columns in mobile order: middle, left, right', () => {
    const { container } = renderLayout();
    const children = [...container.querySelector('.column-layout')!.children];
    expect(children.map((child) => child.classList[1])).toEqual([
      'column-layout-middle',
      'column-layout-left',
      'column-layout-right',
    ]);
  });

  it('makes the middle the main landmark and the sides labelled complementary landmarks', () => {
    renderLayout();
    expect(screen.getByRole('main')).toHaveClass('column-layout-middle');
    expect(screen.getByRole('complementary', { name: 'Left side' })).toHaveClass('column-layout-left');
    expect(screen.getByRole('complementary', { name: 'Right side' })).toHaveClass('column-layout-right');
  });

  it('renders each prop inside its own column', () => {
    renderLayout();
    expect(within(screen.getByRole('main')).getByText('middle content')).toBeInTheDocument();
    expect(within(screen.getByRole('complementary', { name: 'Left side' })).getByText('left content')).toBeInTheDocument();
    expect(within(screen.getByRole('complementary', { name: 'Right side' })).getByText('right content')).toBeInTheDocument();
  });

  it('has the colour and layout classes on its root', () => {
    const { container } = renderLayout();
    expect(container.firstElementChild).toHaveClass('d-column-layout', 'column-layout');
  });
});
