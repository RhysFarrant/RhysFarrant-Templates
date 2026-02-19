import type { ReactNode } from "react";

type TemplateFrameProps = {
  children: ReactNode;
};

export default function TemplateFrame({ children }: TemplateFrameProps) {
  return (
    <section className="rounded-xl border border-border-subtle bg-surface/60 p-5 sm:p-6">
      {children}
    </section>
  );
}
