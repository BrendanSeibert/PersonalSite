import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, expect, it } from 'vitest';
import { routes } from '../routes';
import { renderWithProviders } from '../test/renderWithProviders';
import en from './en.json';
import type { Dictionary } from './translate';

// A copy of the dictionary where every value is its own key in brackets, e.g. ⟦navbar.home⟧.
// Any visible text that is not in brackets did not come from the dictionary.
function markUp(node: Dictionary, path: string[] = []): Dictionary {
  return Object.fromEntries(
    Object.entries(node).map(([key, value]) => [
      key,
      typeof value === 'string' ? `⟦${[...path, key].join('.')}⟧` : markUp(value, [...path, key]),
    ]),
  );
}

const MARKED = /^(\s*⟦[\w.]+⟧\s*)+$/;
const TEXT_ATTRIBUTES = ['aria-label', 'title', 'alt', 'placeholder'];

// Every text node and text attribute in the page that did not come from the dictionary.
function findHardcodedText(): string[] {
  const offenders: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim();
    if (text && !MARKED.test(text)) offenders.push(`text: "${text}"`);
  }
  for (const element of document.body.querySelectorAll('*')) {
    for (const attribute of TEXT_ATTRIBUTES) {
      const value = element.getAttribute(attribute);
      if (value && !MARKED.test(value)) offenders.push(`${attribute}: "${value}"`);
    }
  }
  return offenders;
}

function renderMarkedUp(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  return renderWithProviders(<RouterProvider router={router} />, { withRouter: false, dictionary: markUp(en) });
}

afterEach(() => {
  document.documentElement.lang = '';
});

it.each([
  ['/', '⟦health.ok⟧'],
  ['/frog-library', '⟦frogLibrary.heading⟧'],
  ['/does-not-exist', '⟦notFound.heading⟧'],
])('every visible string on %s comes from en.json', async (url, settledText) => {
  renderMarkedUp(url);
  await screen.findByText(settledText); // wait for async content such as the health check

  expect(findHardcodedText()).toEqual([]);
  expect(document.title).toBe('⟦app.title⟧');
});

it('every string on / comes from en.json after a spin, with the landed card open', async () => {
  const user = userEvent.setup();
  const { container } = renderMarkedUp('/');
  await screen.findByText('⟦health.ok⟧');

  await user.click(screen.getByRole('button', { name: '⟦frogSpinner.button⟧' }));
  fireEvent.transitionEnd(container.querySelector('.frog-spinner-strip')!);
  const card = container.querySelector<HTMLButtonElement>('.frog-spinner-pick .frog-card-face')!;
  await user.click(card);

  expect(card).toHaveAttribute('aria-expanded', 'true');
  expect(container.querySelector('.frog-card-blurb')).toBeVisible();
  expect(container.querySelector('.frog-spinner-result')).toHaveTextContent('⟦frogSpinner.result⟧');
  expect(findHardcodedText()).toEqual([]);
});
