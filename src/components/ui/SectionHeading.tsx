import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
};

export function SectionHeading({ eyebrow, title, description, icon: Icon, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="eyebrow mb-2">
            {Icon && <Icon className="size-3.5" />}
            {eyebrow}
          </p>
        )}
        <h2 className="text-3xl font-bold text-cream sm:text-4xl">{title}</h2>
        {description && <p className="mt-2 text-cream/70">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
