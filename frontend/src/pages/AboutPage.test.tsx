import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import en from '../i18n/en.json';
import { renderWithProviders } from '../test/renderWithProviders';
import { AboutPage } from './AboutPage';
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
} from './aboutContent';
import { GITHUB_URL, PAHERPS_URL } from './contactLinks';

// The citation exactly as it reads on the page (the URL inside it is also a link).
const CITATION =
  'Pa Herp Identification, https://www.paherps.com/herps/frogs-toads/, accessed November 16, 2026';

// The page's text as drawn: screen-reader-only words removed.
function shownText(element: Element) {
  const copy = element.cloneNode(true) as HTMLElement;
  for (const hidden of copy.querySelectorAll('.visually-hidden')) hidden.remove();
  return copy.textContent;
}

// A list's own items, not those of a list nested inside one of them.
const itemsOf = (list: HTMLElement) => [...list.children] as HTMLElement[];

describe('AboutPage', () => {
  it('is the main landmark, focusable by script only, with the "About" heading', () => {
    renderWithProviders(<AboutPage />);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('tabIndex', '-1');
    expect(within(main).getByRole('heading', { level: 2, name: 'About' })).toBeInTheDocument();
  });

  it('names its one <main> "About" and titles the tab "About · Brendan Seibert"', () => {
    renderWithProviders(<AboutPage />);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('main', { name: 'About' })).toBeInTheDocument();
    expect(document.title).toBe('About · Brendan Seibert');
  });

  it('opens with the lead, its GitHub words filled in', () => {
    renderWithProviders(<AboutPage />);
    const lead = document.querySelector('.about-page-lead')!;
    expect(lead).toBe(screen.getByRole('heading', { level: 2 }).nextElementSibling);
    expect(shownText(lead)).toBe(en.about.lead.replace('{gitHub}', en.about.gitHub));
  });

  it('shows the section headings in the order the story goes', () => {
    renderWithProviders(<AboutPage />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      en.about.loop.heading,
      en.about.passes.heading,
      en.about.guardrails.heading,
      en.about.lessons.heading,
      en.about.next.heading,
    ]);
  });

  it('shows the loop as a list named by its heading: each step’s title, who does it, and what happens', () => {
    renderWithProviders(<AboutPage />);
    const list = screen.getByRole('list', { name: en.about.loop.heading });
    expect(list.tagName).toBe('OL');
    const items = itemsOf(list);
    expect(items).toHaveLength(LOOP_STEPS.length);
    items.forEach((item, index) => {
      const id = LOOP_STEPS[index]!;
      const step = en.about.loop.steps[id];
      expect(item.querySelector('strong')).toHaveTextContent(step.title);
      expect(item.querySelector('.about-page-who')).toHaveTextContent(en.about.who[LOOP_WHO[id]]);
      expect(item.querySelector('.about-page-who')).toHaveClass(`is-${WHO_TONE[LOOP_WHO[id]]}`);
      expect(item.querySelector('.about-page-pipeline-body')).toHaveTextContent(step.body);
    });
    // Written out, not read from LOOP_WHO, so a step handed to the wrong person fails here.
    expect(items.map((item) => item.querySelector('.about-page-who')!.textContent)).toEqual([
      'Claude',
      'A fresh Claude session',
      'Me',
      'Claude',
      'The tests',
      'A fresh Claude session',
      'Me',
    ]);
  });

  it('closes the loop back to the start, with its label in bold, and captions it', () => {
    renderWithProviders(<AboutPage />);
    const loopback = document.querySelector('.about-page-loopback')!;
    expect(loopback.textContent).toBe(en.about.loop.loopback.replace('{label}', en.about.loop.loopbackLabel));
    expect(loopback.querySelector('strong')).toHaveTextContent(en.about.loop.loopbackLabel);
    const figure = screen.getByRole('list', { name: en.about.loop.heading }).closest('figure')!;
    expect(figure.querySelector('figcaption')).toHaveTextContent(en.about.loop.caption);
  });

  it('shows the orchestrated passes, with the five lenses nested under the review stage only', () => {
    renderWithProviders(<AboutPage />);
    const list = screen.getByRole('list', { name: en.about.passes.heading });
    const items = itemsOf(list);
    expect(items).toHaveLength(PASS_STAGES.length);
    items.forEach((item, index) => {
      const id = PASS_STAGES[index]!;
      expect(item.querySelector('strong')).toHaveTextContent(en.about.passes.stages[id].title);
      expect(item.querySelector('.about-page-who')).toHaveTextContent(en.about.who[PASS_WHO[id]]);
      expect(item.querySelector('.about-page-pipeline-body')).toHaveTextContent(en.about.passes.stages[id].body);
      const lenses = item.querySelector('.about-page-lenses');
      if (id !== LENS_STAGE) {
        expect(lenses).toBeNull();
        return;
      }
      expect(item.querySelector('.about-page-lenses-label')).toHaveTextContent(en.about.passes.lensesLabel);
      expect(lenses!.tagName).toBe('UL');
      expect(within(lenses as HTMLElement).getAllByRole('listitem').map((li) => li.textContent)).toEqual(
        PASS_LENSES.map((lens) => en.about.passes.lenses[lens]),
      );
    });
    expect(items.map((item) => item.querySelector('.about-page-who')!.textContent)).toEqual([
      'Opus orchestrator',
      'Sonnet agents',
      'Opus orchestrator',
      'Sonnet agents',
      'Opus orchestrator',
    ]);
    expect(list.closest('figure')!.querySelector('figcaption')).toHaveTextContent(en.about.passes.caption);
  });

  it('shows the guardrails as a funnel of layers, the rulebook first and me last', () => {
    renderWithProviders(<AboutPage />);
    const list = screen.getByRole('list', { name: en.about.guardrails.heading });
    const items = itemsOf(list);
    expect(items.map((item) => item.querySelector('strong')!.textContent)).toEqual(
      GUARDRAIL_LAYERS.map((id) => en.about.guardrails.layers[id].name),
    );
    expect(items.map((item) => item.querySelector('span')!.textContent)).toEqual(
      GUARDRAIL_LAYERS.map((id) => en.about.guardrails.layers[id].catches),
    );
    expect(items[0]).toHaveTextContent('CLAUDE.md');
    expect(items.at(-1)!.querySelector('strong')).toHaveTextContent(en.about.who.me);
    expect(list.closest('figure')!.querySelector('figcaption')).toHaveTextContent(en.about.guardrails.caption);
  });

  it('shows each lesson with its title, what happened and what I do now', () => {
    renderWithProviders(<AboutPage />);
    const list = screen.getByRole('list', { name: en.about.lessons.heading });
    const items = itemsOf(list);
    expect(items).toHaveLength(LESSONS.length);
    items.forEach((item, index) => {
      const lesson = en.about.lessons.items[LESSONS[index]!];
      expect(within(item).getByRole('heading', { level: 4 })).toHaveTextContent(lesson.title);
      const [happened, now] = [...item.querySelectorAll('p')];
      expect(happened!.textContent).toBe(`${en.about.lessons.happenedLabel} ${lesson.happened}`);
      expect(now!.textContent).toBe(`${en.about.lessons.nowLabel} ${lesson.now}`);
      // Each line says something after its label: at least a few words, ending in a full stop.
      expect(happened!.textContent).toMatch(/^What happened: \S.{10,}\.$/);
      expect(now!.textContent).toMatch(/^What I do now: \S.{10,}\.$/);
      expect(happened!.querySelector('strong')).toHaveTextContent(en.about.lessons.happenedLabel);
      expect(now!.querySelector('strong')).toHaveTextContent(en.about.lessons.nowLabel);
    });
  });

  it('marks every unstyled list role="list", so Safari still announces it as a list', () => {
    // Safari drops list semantics from a list styled with list-style: none; jsdom and Chromium don't,
    // so the attribute itself is what this checks (the same pattern as the Frog Library grid).
    renderWithProviders(<AboutPage />);
    const lists = [...screen.getByRole('main').querySelectorAll('ol, ul')];
    expect(lists).toHaveLength(5); // loop, passes, lenses, guardrails, lessons
    for (const list of lists) expect(list, list.className).toHaveAttribute('role', 'list');
  });

  it('colours the "who" chips by tone: one for every Claude role, one for me, one for the tests', () => {
    renderWithProviders(<AboutPage />);
    const chips = [...document.querySelectorAll('.about-page-who')];
    expect(chips).toHaveLength(LOOP_STEPS.length + PASS_STAGES.length);
    const toneOf = (chip: Element) => [...chip.classList].find((c) => c.startsWith('is-'));
    expect(chips.filter((chip) => chip.textContent === 'Me').map(toneOf)).toEqual(['is-me', 'is-me']);
    expect(chips.filter((chip) => chip.textContent === 'The tests').map(toneOf)).toEqual(['is-tests']);
    const claudeRoles = chips.filter((chip) => !['Me', 'The tests'].includes(chip.textContent!));
    expect(new Set(claudeRoles.map(toneOf))).toEqual(new Set(['is-claude']));
  });

  it('says what’s next in an aside named by its heading', () => {
    renderWithProviders(<AboutPage />);
    const aside = screen.getByRole('complementary', { name: en.about.next.heading });
    expect(aside).toHaveTextContent(en.about.next.body);
  });

  it('ends with the credits and the citation', () => {
    renderWithProviders(<AboutPage />);
    const credits = document.querySelector('.about-page-credits')!;
    expect(screen.getByRole('main').querySelector('article')!.lastElementChild).toBe(credits);
    expect([...credits.querySelectorAll('p')].map(shownText)).toEqual([en.about.body, CITATION]);
    expect(credits.lastElementChild).toHaveClass('about-page-source');
  });

  it('has no placeholder text or unfilled slot left', () => {
    renderWithProviders(<AboutPage />);
    const text = screen.getByRole('main').textContent;
    expect(text).not.toMatch(/lorem|ipsum/i);
    // Case-sensitive and whole-word: a marker, not a name such as "ToDoApp".
    expect(text).not.toMatch(/\bTODO\b|\{\w+\}/);
  });

  it('has exactly two links, GitHub and the citation, both opening in a new tab', () => {
    renderWithProviders(<AboutPage />);
    const main = screen.getByRole('main');
    expect(within(main).queryAllByRole('button')).toHaveLength(0);
    const links = within(main).getAllByRole('link');
    expect(links).toHaveLength(2);
    const [gitHub, source] = links as [HTMLElement, HTMLElement];

    // (jsdom trims the hidden span's leading space from the name; a real browser keeps it, and
    // a11y.browser.test.tsx checks the exact names in Chromium.)
    expect(gitHub).toHaveAccessibleName(/^my GitHub ?\(opens in a new tab\)$/);
    expect(gitHub).toHaveAttribute('href', GITHUB_URL);
    expect(gitHub).toHaveClass('about-page-link');

    expect(source.firstChild!.textContent).toBe('https://www.paherps.com/herps/frogs-toads/');
    expect(source).toHaveAccessibleName(/^https:\/\/www\.paherps\.com\/herps\/frogs-toads\/ ?\(opens in a new tab\)$/);
    expect(source).toHaveAttribute('href', en.about.sourceUrl); // the shown text and the target agree
    expect(PAHERPS_URL).toBe(en.about.sourceUrl);
    expect(source).toHaveClass('about-page-source-link');

    for (const link of links) {
      expect(link.querySelector('.visually-hidden')!.textContent).toBe(' (opens in a new tab)');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('has the colour and layout classes on its root, and the panel class', () => {
    renderWithProviders(<AboutPage />);
    const main = screen.getByRole('main');
    expect(main).toHaveClass('d-about-page', 'about-page');
    expect(main.firstElementChild).toHaveClass('about-page-panel');
  });
});
