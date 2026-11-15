/**
 * Something on a web page the agent can click or type into. `ref` is the
 * number it uses to point at it; refs are given out again each time the
 * page is read.
 */
export interface BrowserElement {
  ref: number;
  /** link, button, textbox, checkbox, select… */
  kind: string;
  /** Its visible text, label or placeholder. */
  text: string;
  href?: string;
}

/** What every browser tool returns: the page as it is now. */
export interface BrowserPageOutput {
  url: string;
  title: string;
  /** The page's readable text, cut to a few thousand characters. */
  text: string;
  elements: BrowserElement[];
  /** What the page looks like: a JPEG, base64. */
  screenshot?: string;
  /** Why a page the action led to was not opened (a private address). */
  blocked?: string;
}
