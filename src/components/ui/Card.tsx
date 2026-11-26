import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  as?: "div" | "section" | "article";
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-panel",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rotate-45 bg-gold-500" aria-hidden="true" />
      {children}
    </p>
  );
}
