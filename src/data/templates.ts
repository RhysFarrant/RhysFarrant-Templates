import type { ComponentType, LazyExoticComponent } from "react";
import { lazy } from "react";

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

const SaaSProjectManagementDashboard = lazy(
  () => import("@/templates/saas-project-management-dashboard")
);

export const templates: TemplateDef[] = [
  {
    slug: "saas-project-management-dashboard",
    name: "SaaS Project Management Dashboard",
    description:
      "A modern operations dashboard for tracking projects, sprint progress, workload, and team activity.",
    status: "Ready",
    category: "Dashboard",
    stack: ["React", "TypeScript", "Tailwind CSS", "Analytics UI"],
    lastUpdated: "2026-02-21",
    component: SaaSProjectManagementDashboard,
  },
];

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
