import {cn} from '@/lib/utils';

interface SpeechBubbleProps {
  children: React.ReactNode;
  /** Which side the tail points to: toward the character who is talking. */
  tail?: 'left' | 'top' | 'bottom';
  className?: string;
}

/** A rounded bubble with a small tail, for things a character says. */
export function SpeechBubble({
  children,
  tail = 'left',
  className,
}: SpeechBubbleProps) {
  return (
    <div
      className={cn(
        'relative rounded-3xl border bg-card px-4 py-3 text-sm leading-relaxed',
        className,
      )}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          'absolute size-3 rotate-45 border-b border-l bg-card',
          tail === 'left' && 'top-5 -left-1.5',
          tail === 'top' && '-top-1.5 left-10 rotate-[135deg]',
          tail === 'bottom' && '-bottom-1.5 left-10 rotate-[-45deg]',
        )}
      />
    </div>
  );
}
