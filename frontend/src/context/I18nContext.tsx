import { createContext, useContext, useMemo, type ReactNode } from 'react';
import en from '../i18n/en.json';
import { translate, type Dictionary, type TranslationKey, type TranslationParams } from '../i18n/translate';

type I18nValue = { t: (key: TranslationKey, params?: TranslationParams) => string };

const I18nContext = createContext<I18nValue | null>(null);

type Props = { dictionary?: Dictionary; children: ReactNode };

export function I18nProvider({ dictionary = en, children }: Props) {
  // Memoised so components that depend on `t` (for example in a useEffect) don't re-run every render.
  const value = useMemo<I18nValue>(
    () => ({ t: (key, params) => translate(dictionary, key, params) }),
    [dictionary],
  );
  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within an I18nProvider');
  return context;
}
