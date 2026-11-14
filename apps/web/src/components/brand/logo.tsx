import {APP_NAME} from '@binary/shared';

/** The Binary wordmark: a lime "01" tile next to the product name. */
export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-primary font-mono text-xs font-semibold text-primary-foreground">
        01
      </span>
      <span className="text-lg font-semibold tracking-tight">{APP_NAME}</span>
    </div>
  );
}
