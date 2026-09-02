import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Gear } from "@/components/ui/Gear";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, icon: Icon, children }: PageHeaderProps) {
  return (
    <div className="relative overflow-hidden border-b border-brass-500/20">
      <Gear
        teeth={14}
        className="pointer-events-none absolute -top-28 -right-20 size-80 text-brass-500/8 animate-gear-spin"
      />
      <Gear
        teeth={9}
        className="pointer-events-none absolute top-24 right-56 size-24 text-diamond-400/8 animate-gear-spin-reverse"
      />
      <Container className="relative py-12 sm:py-16">
        <p className="eyebrow mb-3">
          {Icon && <Icon className="size-3.5" />}
          {eyebrow}
        </p>
        <h1 className="text-4xl font-bold sm:text-5xl lg:text-6xl">
          <span className="text-brass">{title}</span>
        </h1>
        {description && <p className="mt-4 max-w-2xl text-lg text-cream/70">{description}</p>}
        {children && <div className="mt-6">{children}</div>}
      </Container>
    </div>
  );
}
