import { useEffect } from 'react';
import { screen } from '@testing-library/react';
import { useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from './renderWithProviders';

function ShowPath() {
  return <p>{useLocation().pathname}</p>;
}

describe('renderWithProviders', () => {
  it('starts the memory router at the given route', () => {
    renderWithProviders(<ShowPath />, { route: '/somewhere' });
    expect(screen.getByText('/somewhere')).toBeInTheDocument();
  });

  it.each([
    [false, 1],
    [true, 2],
  ])('with strict: %s, runs a mount effect %i time(s), as StrictMode at the root does', (strict, runs) => {
    const effect = vi.fn();
    function Probe() {
      useEffect(effect, []);
      return null;
    }
    renderWithProviders(<Probe />, { strict });
    expect(effect).toHaveBeenCalledTimes(runs);
  });
});
