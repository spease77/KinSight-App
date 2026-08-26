import type { ReactNode } from "react";

interface PageHeaderProps {
  children: ReactNode;
  className?: string;
}

export function PageHeader({ children, className = "" }: PageHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-20 mb-2 flex h-[44px] w-full items-center justify-between bg-background/95 px-1 backdrop-blur-md ${className}`.trim()}
    >
      {children}
    </header>
  );
}
