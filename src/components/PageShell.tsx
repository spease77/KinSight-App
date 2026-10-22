import type { ReactNode } from "react";

/** Identical outer wrapper on every route so iOS WebKit does not relayout the tab bar. */
export const PAGE_SHELL_CLASS =
  "page-shell w-full min-h-full pb-[calc(60px+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] bg-background";

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
