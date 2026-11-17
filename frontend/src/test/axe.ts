import axe from 'axe-core';
import { expect } from 'vitest';

// Only the WCAG 2.0, 2.1 and 2.2 Level A and AA rules: no best-practice or AAA rules.
const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// Runs axe over the rendered page and fails with one readable line per broken rule and element.
// "Incomplete" results (rules axe couldn't decide, such as contrast over the spinner window's
// gradient) are logged, not failed: contrast is guarded by contrast.test.ts and the hand checks.
// `skipRules` turns rules off for one scan; every use needs a comment saying why.
export async function expectNoAxeViolations(
  context: axe.ElementContext = document,
  { skipRules = [] }: { skipRules?: string[] } = {},
) {
  const rules = Object.fromEntries(skipRules.map((id) => [id, { enabled: false }]));
  const { violations, incomplete } = await axe.run(context, { runOnly: { type: 'tag', values: WCAG_AA }, rules });
  const describe = (results: axe.Result[]) =>
    results.flatMap((v) => v.nodes.map((n) => `${v.id} (${v.impact}): ${n.target.join(' ')}`));
  const unsure = describe(incomplete);
  if (unsure.length > 0) console.info(`axe could not decide (not failed):\n${unsure.join('\n')}`);
  expect(describe(violations)).toEqual([]);
}
