import { screen } from '@testing-library/react';
import { useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from './renderWithProviders';

function ShowPath() {
  return <p>{useLocation().pathname}</p>;
}

describe('renderWithProviders', () => {
  it('starts the memory router at the given route', () => {
    renderWithProviders(<ShowPath />, { route: '/somewhere' });
    expect(screen.getByText('/somewhere')).toBeInTheDocument();
  });
});
