import type { ReactNode } from "react";

interface PageHeaderProps {
  children: ReactNode;
  className?: string;
}

export function PageHeader({ children, className = "" }: PageHeaderProps) {
  return (
    <header
      className={`page-header-chrome -mt-[env(safe-area-inset-top,0px)] w-full shrink-0 bg-background pt-[env(safe-area-inset-top,0px)] opacity-100 ${className}`.trim()}
    >
      <div className="mb-2 flex min-h-[44px] w-full items-center justify-between px-1">
        {children}
      </div>
    </header>
  );
}
