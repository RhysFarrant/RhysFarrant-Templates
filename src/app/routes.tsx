import type { RouteObject } from "react-router-dom";
import App from "@/app/App";
import { templates } from "@/data/templates";
import NotFound from "@/pages/NotFound";
import RouteError from "@/pages/RouteError";
import TemplatePage from "@/pages/TemplatePage";
import TemplatesIndex from "@/pages/TemplatesIndex";

const templateRoutes: RouteObject[] = templates.map((template) => ({
  path: template.slug,
  element: <TemplatePage template={template} />,
}));

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <TemplatesIndex /> },
      ...templateRoutes,
      { path: "*", element: <NotFound /> },
    ],
  },
];
