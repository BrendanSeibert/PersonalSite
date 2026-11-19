import { useI18n } from '../context/I18nContext';

// Other sites and PDFs open in a new tab, so the site stays open behind them; noopener stops the
// new tab from reaching back into this one. A screen reader hears that it opens a new tab (and,
// for a PDF, that it is one); nothing changes on screen. No styles of its own: the caller passes
// its own link class, so it looks like the page's other links.
export function NewTabLink({
  href,
  pdf = false,
  className,
  children,
}: {
  href: string;
  pdf?: boolean;
  className: string;
  children: string;
}) {
  const { t } = useI18n();
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      {/* The leading space keeps a screen reader from running the words together. */}
      <span className="visually-hidden"> {t(pdf ? 'link.newTabPdf' : 'link.newTab')}</span>
    </a>
  );
}
