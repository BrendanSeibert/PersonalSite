import { screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { renderWithProviders } from '../test/renderWithProviders';
import { HealthStatus } from './HealthStatus';

describe('HealthStatus', () => {
  it('shows "Checking..." first, in a status element', async () => {
    renderWithProviders(<HealthStatus />);
    expect(screen.getByRole('status')).toHaveTextContent('Checking...');
    await screen.findByText('API ok, database up'); // let the request settle before cleanup
  });

  it('shows "API ok, database up" when the API is healthy', async () => {
    renderWithProviders(<HealthStatus />);
    expect(await screen.findByText('API ok, database up')).toBeInTheDocument();
  });

  it('shows "API unavailable" on 503', async () => {
    server.use(
      http.get('/api/health', () => HttpResponse.json({ status: 'degraded', db: 'down' }, { status: 503 })),
    );
    renderWithProviders(<HealthStatus />);
    expect(await screen.findByText('API unavailable')).toBeInTheDocument();
  });

  it('shows "API unavailable" on a network error', async () => {
    server.use(http.get('/api/health', () => HttpResponse.error()));
    renderWithProviders(<HealthStatus />);
    expect(await screen.findByText('API unavailable')).toBeInTheDocument();
  });

  it('has the colour and layout classes', async () => {
    renderWithProviders(<HealthStatus />);
    expect(screen.getByRole('status')).toHaveClass('d-health-status', 'health-status');
    await screen.findByText('API ok, database up');
  });
});
