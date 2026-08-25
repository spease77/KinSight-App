import type { ReactNode } from "react";

interface PageHeaderProps {
  children: ReactNode;
  className?: string;
}

export function PageHeader({ children, className = "" }: PageHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-20 mb-2 w-full bg-background/95 pt-[max(env(safe-area-inset-top),20px)] pb-3 backdrop-blur-md ${className}`.trim()}
    >
      {children}
    </header>
  );
}
