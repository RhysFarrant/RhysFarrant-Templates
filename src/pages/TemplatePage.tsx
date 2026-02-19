import { Suspense } from "react";
import { Link } from "react-router-dom";
import TemplateFrame from "@/components/templates/TemplateFrame";
import TemplateMeta from "@/components/templates/TemplateMeta";
import type { TemplateDef } from "@/data/templates";

type TemplatePageProps = {
  template: TemplateDef;
};

export default function TemplatePage({ template }: TemplatePageProps) {
  const TemplateComponent = template.component;

  return (
    <section className="px-6 py-8 sm:px-10 sm:py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text-primary"
          >
            <span aria-hidden="true">&larr;</span>
            Back to Templates
          </Link>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{template.name}</h1>
          <p className="mt-2 text-sm text-text-secondary">{template.description}</p>
        </div>
        <TemplateMeta template={template} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {template.stack.map((item) => (
          <span
            key={item}
            className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-text-muted"
          >
            {item}
          </span>
        ))}
      </div>

      <Suspense
        fallback={
          <TemplateFrame>
            <p className="text-sm text-text-muted">Loading template...</p>
          </TemplateFrame>
        }
      >
        <TemplateFrame>
          <TemplateComponent />
        </TemplateFrame>
      </Suspense>
    </section>
  );
}
