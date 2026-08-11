import type { LucideIcon } from "lucide-react";

interface PageTitleProps {
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function PageTitle({ icon: Icon, children, className }: PageTitleProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Icon
        className="h-7 w-7 shrink-0 text-accent-green"
        strokeWidth={2.25}
        aria-hidden="true"
      />
      <h1 className="type-page-title font-sans text-2xl font-bold tracking-tight text-foreground">
        {children}
      </h1>
    </div>
  );
}
