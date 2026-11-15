import {z} from 'zod';

// The most elements the agent is shown per page; enough for a form or a
// menu, few enough to keep each step cheap.
export const MAX_ELEMENTS = 80;

/**
 * Runs inside the page: finds what can be clicked or typed into, marks each
 * with `data-binary-ref="N"` so a later click can find it, and describes
 * it. It is a string because it runs in the browser, not in Node.
 */
export const MARK_ELEMENTS = `(() => {
  for (const old of document.querySelectorAll('[data-binary-ref]')) {
    old.removeAttribute('data-binary-ref');
  }
  const selector = 'a[href], button, input:not([type=hidden]), textarea, select, [role=button], [role=link], [role=checkbox], [role=tab], [contenteditable=true]';
  const found = [];
  for (const element of document.querySelectorAll(selector)) {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (box.width === 0 || box.height === 0 || style.visibility === 'hidden' || element.disabled) {
      continue;
    }
    const ref = found.length + 1;
    element.setAttribute('data-binary-ref', String(ref));
    const tag = element.tagName.toLowerCase();
    const type = (element.getAttribute('type') || '').toLowerCase();
    const kind = element.getAttribute('role') ||
      (tag === 'a' ? 'link' : tag === 'input' ? (['checkbox', 'radio', 'submit', 'button'].includes(type) ? type : 'textbox') : tag === 'textarea' ? 'textbox' : tag);
    const label = element.labels && element.labels[0] ? element.labels[0].innerText : '';
    const text = (element.innerText || element.getAttribute('aria-label') || label || element.getAttribute('placeholder') || (type === 'password' ? '' : element.value) || element.getAttribute('name') || '').trim().replace(/\\s+/g, ' ').slice(0, 80);
    found.push(tag === 'a' ? {ref, kind, text, href: element.getAttribute('href')} : {ref, kind, text});
    if (found.length >= ${MAX_ELEMENTS}) {
      break;
    }
  }
  return found;
})()`;

/** What MARK_ELEMENTS returns, checked, because it comes from a web page. */
export const pageElementsSchema = z.array(
  z.object({
    ref: z.number().int().positive(),
    kind: z.string().max(40),
    text: z.string().max(80),
    href: z
      .string()
      .max(2000)
      .nullish()
      .transform((href) => href ?? undefined),
  }),
);
