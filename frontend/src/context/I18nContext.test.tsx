import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TranslationKey, TranslationParams } from '../i18n/translate';
import { I18nProvider, useI18n } from './I18nContext';

function Show({ k, params }: { k: TranslationKey; params?: TranslationParams }) {
  const { t } = useI18n();
  return <p>{t(k, params)}</p>;
}

describe('I18nContext', () => {
  it('throws when useI18n is used outside an I18nProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // React logs the thrown error
    expect(() => render(<Show k="navbar.home" />)).toThrow('useI18n must be used within an I18nProvider');
    vi.restoreAllMocks();
  });

  it('uses the English dictionary by default', () => {
    render(
      <I18nProvider>
        <Show k="navbar.home" />
      </I18nProvider>,
    );
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('uses the dictionary passed as a prop', () => {
    render(
      <I18nProvider dictionary={{ navbar: { home: 'Accueil' } }}>
        <Show k="navbar.home" />
      </I18nProvider>,
    );
    expect(screen.getByText('Accueil')).toBeInTheDocument();
  });

  it('interpolates {param} placeholders through t', () => {
    render(
      <I18nProvider dictionary={{ navbar: { home: 'Home of {name}' } }}>
        <Show k="navbar.home" params={{ name: 'frogs' }} />
      </I18nProvider>,
    );
    expect(screen.getByText('Home of frogs')).toBeInTheDocument();
  });
});
