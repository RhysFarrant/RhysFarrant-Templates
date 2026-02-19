import Pill from "@/components/ui/Pill";
import type { TemplateDef } from "@/data/templates";
import { formatIsoDate } from "@/templates/_shared/date";

type TemplateMetaProps = {
  template: TemplateDef;
};

const statusToneMap = {
  Draft: "draft",
  Ready: "ready",
  Archived: "archived",
} as const;

const categoryToneMap = {
  Web: "web",
  Mobile: "mobile",
  Dashboard: "dashboard",
} as const;

export default function TemplateMeta({ template }: TemplateMetaProps) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={statusToneMap[template.status]}>{template.status}</Pill>
        <Pill tone={categoryToneMap[template.category]}>{template.category}</Pill>
      </div>
      <span className="text-xs text-text-muted">Updated {formatIsoDate(template.lastUpdated)}</span>
    </div>
  );
}
