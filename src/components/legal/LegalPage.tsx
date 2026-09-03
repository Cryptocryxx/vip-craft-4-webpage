import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { LegalPlaceholderNotice } from "@/components/legal/LegalPlaceholderNotice";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel } from "@/components/ui/Panel";
import { formatDate } from "@/lib/format";
import { legal } from "@/lib/legal";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
};

export function LegalPage({ eyebrow, title, description, icon, children }: LegalPageProps) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} icon={icon} title={title} description={description} />
      <Container className="py-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <LegalPlaceholderNotice />
          <Panel className="p-6 sm:p-10">
            <article className="prose-legal">{children}</article>
            <p className="mt-10 border-t border-white/10 pt-4 text-xs text-cream/45">
              Stand dieser Fassung: {formatDate(legal.lastUpdated)}
            </p>
          </Panel>
        </div>
      </Container>
    </>
  );
}
