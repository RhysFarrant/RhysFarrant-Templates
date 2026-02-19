import type { ComponentType, LazyExoticComponent } from "react";

export type TemplateStatus = "Draft" | "Ready" | "Archived";
export type TemplateCategory = "Web" | "Mobile" | "Dashboard";

type TemplateComponent = ComponentType | LazyExoticComponent<ComponentType>;

export type TemplateDef = {
  slug: string;
  name: string;
  description: string;
  status: TemplateStatus;
  category: TemplateCategory;
  stack: string[];
  lastUpdated: string;
  component: TemplateComponent;
};

export const templates: TemplateDef[] = [];

function assertUniqueSlugs(defs: TemplateDef[]): void {
  const seen = new Set<string>();
  for (const def of defs) {
    if (seen.has(def.slug)) {
      throw new Error(`Duplicate template slug found: ${def.slug}`);
    }
    seen.add(def.slug);
  }
}

assertUniqueSlugs(templates);
