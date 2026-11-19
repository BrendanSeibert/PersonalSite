import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { fillSlots } from './fillSlots';

const html = (text: string, slots: Parameters<typeof fillSlots>[1]) =>
  render(<p>{fillSlots(text, slots)}</p>).container.firstElementChild!.innerHTML;

describe('fillSlots', () => {
  it('puts each slot at its placeholder, keeping the text around it', () => {
    expect(html('Mail {email}, or see {site}.', { email: <a href="mailto:x">x</a>, site: <b>here</b> })).toBe(
      'Mail <a href="mailto:x">x</a>, or see <b>here</b>.',
    );
  });

  it('handles placeholders at the start and the end, and repeated ones', () => {
    expect(html('{a} and {a}', { a: <i>A</i> })).toBe('<i>A</i> and <i>A</i>');
  });

  it('returns text without placeholders unchanged', () => {
    expect(html('Just words.', {})).toBe('Just words.');
  });

  it('leaves a placeholder with no slot visible, as written', () => {
    expect(html('Hi {missing}!', {})).toBe('Hi {missing}!');
  });

  it('leaves a placeholder named like an Object.prototype member as written', () => {
    expect(html('x {toString} y', {})).toBe('x {toString} y');
  });

  it('never treats text as markup', () => {
    expect(html('<b>not bold</b> {x}', { x: 'plain' })).toBe('&lt;b&gt;not bold&lt;/b&gt; plain');
  });
});
