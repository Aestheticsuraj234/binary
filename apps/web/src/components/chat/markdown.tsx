'use client';

import {normalizeMath} from '@binary/shared';
import {createCodePlugin} from '@streamdown/code';
import {createMathPlugin} from '@streamdown/math';
import 'katex/dist/katex.min.css';
import {Streamdown} from 'streamdown';
import 'streamdown/styles.css';

import {cn} from '@/lib/utils';

// Shiki highlights code blocks. The app is always dark, but Streamdown wants
// a [light, dark] pair; "github-dark-default" suits the near-black canvas.
const code = createCodePlugin({
  themes: ['github-light-default', 'github-dark-default'],
});
// KaTeX for $$…$$ (and LaTeX's \(…\) and \[…\], via normalizeMath).
const math = createMathPlugin();

interface MarkdownProps {
  children: string;
  /** True while the answer is still arriving. */
  isStreaming?: boolean;
  className?: string;
}

/**
 * Renders a model's answer as Markdown with Streamdown: headings, lists,
 * tables, links, math and highlighted code with a copy button.
 *
 * Streamdown is built for streaming: it closes half-written Markdown (an
 * open code fence, a lone `**`) while the answer is still arriving, so the
 * text never flashes raw symbols. Links ask before opening, because the
 * model chose them, not the user.
 */
export function Markdown({
  children,
  isStreaming = false,
  className,
}: MarkdownProps) {
  return (
    <Streamdown
      plugins={{code, math}}
      isAnimating={isStreaming}
      animated
      caret="block"
      className={cn('min-w-0 space-y-3 text-sm leading-relaxed', className)}
    >
      {normalizeMath(children)}
    </Streamdown>
  );
}
