import { useEffect } from 'react';
import { useI18n } from '../context/I18nContext';
import type { TranslationKey } from '../i18n/translate';

// The browser tab's title for the page being shown: "Frog Library · Brendan Seibert", or the
// site name alone when no page key is given (the home page). Every page calls this once.
// (AppLayout no longer sets the title: children's effects run before their parent's, so a title
// set there would overwrite the page's on the first load.)
export function usePageTitle(pageKey?: TranslationKey) {
  const { t } = useI18n();
  const site = t('app.title');
  const title = pageKey ? t('app.pageTitle', { page: t(pageKey), site }) : site;

  useEffect(() => {
    document.title = title;
  }, [title]);
}
