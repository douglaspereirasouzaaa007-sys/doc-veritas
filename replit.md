# Document Verifier Pro

A document verification system for medical certificates, prescriptions, and reports. Generates QR codes and professional public pages for each document, with an owner panel for management and a REST API for integration with external systems.

## Stack

- **Frontend/backend**: React 19 + TanStack Start/Router
- **Database**: PostgreSQL via `DATABASE_URL`, com estado JSONB persistente
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Runtime**: Bun

## How to run

```sh
bun install
bun run dev
```

The development server starts on port 5000. Production runs on a Replit VM at port 5000.

## Project structure

- `src/routes/` — file-based pages (TanStack Router)
- `src/components/` — shared UI components
- `src/lib/store.server.ts` — PostgreSQL-backed owner, documents, QR references, and application state
- `src/lib/backup.*` — validated document backup and append-only restoration

## Acesso do proprietário

The first successful signup becomes the sole owner. No email confirmation is required.
After that, signup is permanently closed; sign in with the email and password used for the first signup.
The owner account is stored in PostgreSQL. `SESSION_SECRET` must be configured to sign sessions.
There are no default admin credentials.

## User preferences

- Keep the existing project structure and stack
- Use Brazilian date/number formatting throughout the UI
