import type { ReactNode } from "react";

/** Inner page scroller. Headers stay outside this so iOS cannot fade them. */
export function PageBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`page-body no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[80px] ${className}`.trim()}
    >
      {children}
    </div>
  );
}
