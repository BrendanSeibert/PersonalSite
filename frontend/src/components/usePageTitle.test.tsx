import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { I18nProvider } from '../context/I18nContext';
import en from '../i18n/en.json';
import type { Dictionary, TranslationKey } from '../i18n/translate';
import { usePageTitle } from './usePageTitle';

function renderTitle(pageKey?: TranslationKey, dictionary: Dictionary = en) {
  const wrapper = ({ children }: { children: ReactNode }) => <I18nProvider dictionary={dictionary}>{children}</I18nProvider>;
  return renderHook((key: TranslationKey | undefined) => usePageTitle(key), { initialProps: pageKey, wrapper });
}

afterEach(() => {
  document.title = '';
});

describe('usePageTitle', () => {
  it('is the site name alone with no page key (the home page)', () => {
    renderTitle();
    expect(document.title).toBe(en.app.title);
    expect(document.title).toBe('Brendan Seibert');
  });

  it('is "<page> · <site>" with a page key, from en.json', () => {
    renderTitle('about.heading');
    expect(document.title).toBe('About · Brendan Seibert');
  });

  it('follows the dictionary’s format, so a translation can reorder it', () => {
    renderTitle('frogLibrary.heading', { ...en, app: { ...en.app, title: 'Le site', pageTitle: '{site} — {page}' } });
    expect(document.title).toBe('Le site — Frog Library');
  });

  it('changes when the page key changes', () => {
    const { rerender } = renderTitle('about.heading');
    rerender('notFound.heading');
    expect(document.title).toBe('Page not found · Brendan Seibert');
    rerender(undefined);
    expect(document.title).toBe('Brendan Seibert');
  });
});
