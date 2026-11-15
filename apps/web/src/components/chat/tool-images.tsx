import {toolCallImages, type ToolCallView} from '@binary/shared';

import {cn} from '@/lib/utils';

/**
 * Pictures a tool made, shown under its row without opening it: a chart
 * or what the browser sees is usually the point of the step.
 */
export function ToolImages({call}: {call: ToolCallView}) {
  const images = toolCallImages(call);
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
