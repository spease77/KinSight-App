import type { ReactNode } from "react";

/** Same overflow-hidden column as Home on every route so the tab bar cannot jump. */
export const PAGE_SHELL_CLASS =
  "page-shell flex h-full min-h-0 w-full flex-col overflow-hidden bg-background";

export function PageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${PAGE_SHELL_CLASS} ${className}`.trim()}>{children}</div>
  );
}
