import { MAX_TEXT_LENGTH } from '../constants';

/** Generate a CSS selector for an element */
export function getSelector(el: Element): string {
  if (el.id) {
    return `#${el.id}`;
  }

  const tag = el.tagName.toLowerCase();

  if (el.className && typeof el.className === 'string') {
    const classes = el.className.trim().split(/\s+/).slice(0, 3).join('.');
    if (classes) {
      return `${tag}.${classes}`;
    }
  }

  // Fallback: tag + nth-child
  const parent = el.parentElement;
  if (parent) {
    const siblings = Array.from(parent.children).filter((c) => c.tagName === el.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      return `${tag}:nth-child(${index})`;
    }
  }

  return tag;
}

/** Extract trimmed, truncated text content from an element */
export function getElementText(el: Element): string {
  const text = (el.textContent || '').trim();
  return text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) + '...' : text;
}

/** Get element info useful for analytics */
export function getElementInfo(el: Element) {
  return {
    selector: getSelector(el),
    tagName: el.tagName.toLowerCase(),
    text: getElementText(el),
    href: (el as HTMLAnchorElement).href || undefined,
  };
}
