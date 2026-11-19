import { NewTabLink } from '../components/NewTabLink';
import { usePageTitle } from '../components/usePageTitle';
import { useI18n } from '../context/I18nContext';
import { fillSlots } from '../i18n/fillSlots';
import {
  GUARDRAIL_LAYERS,
  LENS_STAGE,
  LESSONS,
  LOOP_STEPS,
  LOOP_WHO,
  PASS_LENSES,
  PASS_STAGES,
  PASS_WHO,
  WHO_TONE,
  type Who,
} from './aboutContent';
import { GITHUB_URL, PAHERPS_URL } from './contactLinks';
import './AboutPage.scss';

// How the site was built: a lead, the everyday loop, the same loop scaled up as orchestrated
// passes, the guardrails funnel, the lessons, what's next, and the credits. Every diagram is a
// styled list, so it reflows at any width or text size and reads as a list to a screen reader.
// role="list" on each: Safari drops list semantics from a list styled with list-style: none.
export function AboutPage() {
  const { t } = useI18n();
  usePageTitle('about.heading');

  // The "who" chip: its colour comes from its tone class, its words from en.json.
  const whoChip = (who: Who) => (
    <span className={`about-page-who is-${WHO_TONE[who]}`}>{t(`about.who.${who}`)}</span>
  );

  return (
    // tabIndex -1: AppLayout focuses <main> after a navigation; never a Tab stop. Named for the
    // page, so a screen reader says which page opened when focus lands here.
    <main className="d-about-page about-page" tabIndex={-1} aria-label={t('about.heading')}>
      <article className="about-page-panel">
        <h2>{t('about.heading')}</h2>
        <p className="about-page-lead">
          {fillSlots(t('about.lead'), {
            gitHub: (
              <NewTabLink className="about-page-link" href={GITHUB_URL}>
                {t('about.gitHub')}
              </NewTabLink>
            ),
          })}
        </p>

        {/* Fixed ids are safe: only one About page is ever mounted. */}
        <h3 id="about-page-loop">{t('about.loop.heading')}</h3>
        <figure className="about-page-figure">
          <ol className="about-page-pipeline" role="list" aria-labelledby="about-page-loop">
            {LOOP_STEPS.map((id) => (
              <li key={id}>
                <div className="about-page-pipeline-head">
                  <strong>{t(`about.loop.steps.${id}.title`)}</strong>
                  {whoChip(LOOP_WHO[id])}
                </div>
                <p className="about-page-pipeline-body">{t(`about.loop.steps.${id}.body`)}</p>
              </li>
            ))}
          </ol>
          <p className="about-page-loopback">
            {fillSlots(t('about.loop.loopback'), { label: <strong>{t('about.loop.loopbackLabel')}</strong> })}
          </p>
          <figcaption>{t('about.loop.caption')}</figcaption>
        </figure>

        <h3 id="about-page-passes">{t('about.passes.heading')}</h3>
        <figure className="about-page-figure">
          <ol className="about-page-pipeline" role="list" aria-labelledby="about-page-passes">
            {PASS_STAGES.map((id) => (
              <li key={id}>
                <div className="about-page-pipeline-head">
                  <strong>{t(`about.passes.stages.${id}.title`)}</strong>
                  {whoChip(PASS_WHO[id])}
                </div>
                <p className="about-page-pipeline-body">{t(`about.passes.stages.${id}.body`)}</p>
                {/* The fan-out: a nested list, so a screen reader hears "list, 5 items" too. */}
                {id === LENS_STAGE && (
                  <>
                    <p className="about-page-lenses-label">{t('about.passes.lensesLabel')}</p>
                    <ul className="about-page-lenses" role="list">
                      {PASS_LENSES.map((lens) => (
                        <li key={lens}>{t(`about.passes.lenses.${lens}`)}</li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            ))}
          </ol>
          <figcaption>{t('about.passes.caption')}</figcaption>
        </figure>

        <h3 id="about-page-guardrails">{t('about.guardrails.heading')}</h3>
        <figure className="about-page-figure">
          <ol className="about-page-layers" role="list" aria-labelledby="about-page-guardrails">
            {GUARDRAIL_LAYERS.map((id) => (
              <li key={id}>
                <strong>{t(`about.guardrails.layers.${id}.name`)}</strong>
                <span>{t(`about.guardrails.layers.${id}.catches`)}</span>
              </li>
            ))}
          </ol>
          <figcaption>{t('about.guardrails.caption')}</figcaption>
        </figure>

        <h3 id="about-page-lessons">{t('about.lessons.heading')}</h3>
        <ol className="about-page-lessons" role="list" aria-labelledby="about-page-lessons">
          {LESSONS.map((id) => (
            <li key={id}>
              <h4>{t(`about.lessons.items.${id}.title`)}</h4>
              <p>
                <strong>{t('about.lessons.happenedLabel')}</strong> {t(`about.lessons.items.${id}.happened`)}
              </p>
              <p>
                <strong>{t('about.lessons.nowLabel')}</strong> {t(`about.lessons.items.${id}.now`)}
              </p>
            </li>
          ))}
        </ol>

        <aside className="about-page-aside" aria-labelledby="about-page-next">
          <h3 id="about-page-next">{t('about.next.heading')}</h3>
          <p>{t('about.next.body')}</p>
        </aside>

        <footer className="about-page-credits">
          <p>{t('about.body')}</p>
          <p className="about-page-source">
            {fillSlots(t('about.source'), {
              // The citation shows its URL as written; the link only makes it clickable (new tab).
              url: (
                <NewTabLink className="about-page-source-link" href={PAHERPS_URL}>
                  {t('about.sourceUrl')}
                </NewTabLink>
              ),
            })}
          </p>
        </footer>
      </article>
    </main>
  );
}
