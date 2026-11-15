import type {ToolCallView} from '@binary/shared';

import {cn} from '@/lib/utils';

import {field, text} from './output-fields';
import {chartsOf} from './sandbox-output';

interface ToolImage {
  src: string;
  alt: string;
}

/** Charts from a code run, or the screenshot of a browser step. */
function imagesOf(call: ToolCallView): ToolImage[] {
  if (call.status !== 'succeeded') {
    return [];
  }
  const charts = chartsOf(call.output).map((png, index) => ({
    src: `data:image/png;base64,${png}`,
    alt: `Chart ${index + 1} from the sandbox`,
  }));
  const screenshot = text(field(call.output, 'screenshot'));
  const title = text(field(call.output, 'title'));
  // Browsers send JPEGs, desktops PNGs; a PNG's base64 starts "iVBOR".
  const type = screenshot.startsWith('iVBOR') ? 'png' : 'jpeg';
  return screenshot
    ? [
        ...charts,
        {
          src: `data:image/${type};base64,${screenshot}`,
          alt: title ? `Screenshot of ${title}` : 'Screenshot of the screen',
        },
      ]
    : charts;
}

/**
 * Pictures a tool made, shown under its row without opening it: a chart
 * or what the browser sees is usually the point of the step.
 */
export function ToolImages({call}: {call: ToolCallView}) {
  const images = imagesOf(call);
  if (images.length === 0) {
    return null;
  }
  return (
    <div
      className={cn(
        'grid gap-2 border-t p-2',
        images.length > 1 ? 'sm:grid-cols-2' : 'max-w-xl',
      )}
    >
      {images.map((image) => (
        // A data URL from our own API; next/image adds nothing here.
        <img
          key={image.alt}
          src={image.src}
          alt={image.alt}
          className="w-full rounded-xl border bg-white"
        />
      ))}
    </div>
  );
}
