import { useMemo, useState } from "react";
import Input from "@/components/ui/Input";
import TemplateCard from "@/components/templates/TemplateCard";
import { templates, type TemplateStatus } from "@/data/templates";

const statusOptions: Array<"All" | TemplateStatus> = [
  "All",
  "Draft",
  "Ready",
  "Archived",
];

export default function TemplatesIndex() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"All" | TemplateStatus>("All");

  const visibleTemplates = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return templates.filter((template) => {
      const statusMatch = status === "All" || template.status === status;
      const textMatch =
        normalizedQuery.length === 0 ||
        template.name.toLowerCase().includes(normalizedQuery) ||
        template.description.toLowerCase().includes(normalizedQuery) ||
        template.stack.join(" ").toLowerCase().includes(normalizedQuery);

      return statusMatch && textMatch;
    });
  }, [query, status]);

  return (
    <section className="hero-gradient px-6 py-8 sm:px-10 sm:py-10">
      <div className="mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-text-muted">
          Templates Workspace
        </p>
        <h1 className="text-3xl font-bold sm:text-4xl">Templates</h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary sm:text-base">
          Reusable app design templates and starter interfaces.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_180px]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, description, or stack..."
          aria-label="Search templates"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as "All" | TemplateStatus)}
          className="w-full rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent/60"
          aria-label="Filter by status"
        >
          {statusOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {visibleTemplates.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface/50 p-6 text-sm text-text-muted">
          No templates yet. Add entries to <code>src/data/templates.ts</code> to get started.
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {visibleTemplates.map((template) => (
            <TemplateCard key={template.slug} template={template} />
          ))}
        </div>
      )}
    </section>
  );
}
