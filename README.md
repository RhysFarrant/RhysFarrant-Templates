# RhysFarrant Templates

Single React + Vite templates app for `templates.rhysfarrant.com`.

## Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router

## Routes

- `/` -> templates index
- `/<slug>` -> registered template page
- `*` -> not found

## Add a new template

1. Create `src/templates/<slug>/index.tsx` and export a default React component.
2. Register it in `src/data/templates.ts` with metadata and lazy import.
3. It appears on `/` and is routed automatically.

## Local development

```bash
npm install
npm run dev
```
