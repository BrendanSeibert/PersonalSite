import { Fragment, type ReactNode } from 'react';

// Puts elements (links, emphasis) into a translated sentence at its {name} placeholders, so the
// sentence stays whole in en.json instead of being cut into pieces around each link:
//   fillSlots('Mail {email} today', { email: <a href="...">me</a> })
// A placeholder with no matching slot stays visible as written, like a missing translation key.
export function fillSlots(text: string, slots: Record<string, ReactNode>): ReactNode[] {
  // split() with a capture group alternates: text, placeholder name, text, placeholder name, ...
  return text.split(/\{(\w+)\}/).map((part, index) => {
    const isPlaceholder = index % 2 === 1;
    const content = isPlaceholder ? (Object.hasOwn(slots, part) ? slots[part] : `{${part}}`) : part;
    return <Fragment key={index}>{content}</Fragment>;
  });
}
