import type { ReactNode } from "react";

interface PageHeaderProps {
  children: ReactNode;
  className?: string;
}

export function PageHeader({ children, className = "" }: PageHeaderProps) {
  return (
    <header
      className={`page-header-chrome sticky top-0 z-20 mb-2 flex h-[44px] w-full items-center justify-between bg-background px-1 opacity-100 ${className}`.trim()}
    >
      {children}
    </header>
  );
}
