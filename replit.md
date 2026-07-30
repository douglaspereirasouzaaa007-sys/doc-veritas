# Document Verifier Pro

A document verification system for medical certificates, prescriptions, and reports. Generates QR codes and professional public pages for each document, with an owner panel for management and a REST API for integration with external systems.

## Stack

- **Frontend**: React 19 + TanStack Router (file-based routing)
- **Backend**: TanStack Start (SSR, server functions)
- **Database**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Runtime**: Bun

## How to run

```sh
bun install
bun run dev
```

The dev server starts on port 5000.

## Project structure

- `src/routes/` — file-based pages (TanStack Router)
- `src/components/` — shared UI components
- `src/integrations/supabase/` — Supabase client and auth helpers
- `supabase/migrations/` — database schema migrations

## User preferences

- Keep the existing project structure and stack
- Use Brazilian date/number formatting throughout the UI
