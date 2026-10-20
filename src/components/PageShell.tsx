import type { ReactNode } from "react";

/** Identical outer shell for every route so iOS does not recalc the viewport on tab changes. */
export const PAGE_SHELL_CLASS =
  "page-shell min-h-full w-full bg-background";

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
