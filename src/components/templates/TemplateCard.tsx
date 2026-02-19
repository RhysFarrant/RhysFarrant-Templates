import { Link } from "react-router-dom";
import type { TemplateDef } from "@/data/templates";
import TemplateMeta from "@/components/templates/TemplateMeta";

type TemplateCardProps = {
  template: TemplateDef;
};

export default function TemplateCard({ template }: TemplateCardProps) {
  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-surface/65 p-4 transition-colors hover:bg-surface-hover/70">
      <div>
        <h3 className="text-lg font-semibold">{template.name}</h3>
        <p className="mt-1 text-sm text-text-secondary">{template.description}</p>
      </div>

      <div className="mt-auto pt-3">
        <TemplateMeta template={template} />

        <div className="mt-3 flex flex-wrap gap-2">
          {template.stack.map((item) => (
            <span
              key={item}
              className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-text-muted"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-4">
          <Link
            to={`/${template.slug}`}
            className="inline-flex w-full items-center justify-center rounded-lg border border-accent/50 bg-accent/20 px-3.5 py-2 text-sm font-medium text-text-primary transition-colors hover:border-accent hover:bg-accent/30"
          >
            Open
          </Link>
        </div>
      </div>
    </article>
  );
}
