# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js App Router application. Put pages, layouts, global styles, and API route handlers in `app/`; API endpoints live under `app/api/`. Shared server logic and authentication helpers belong in `lib/`, while the Drizzle schema is in `db/` and generated SQL migrations are in `drizzle/`. Static assets served directly belong in `public/`. Keep route-specific UI near its route and reusable logic in `lib/`.

## Build, Test, and Development Commands

- `npm install` installs dependencies (Node.js `>=22.13.0` is required).
- `npm run dev` starts the local Next.js development server.
- `npm run lint` runs ESLint across the repository.
- `npm run build` creates a production build; `npm run start` serves that build.
- `npm run db:generate` generates a Drizzle migration after schema changes; `npm run db:migrate` applies migrations to the database in `DATABASE_URL`.

Set `DATABASE_URL` in an untracked `.env.local` before running database commands. Google sign-in and email delivery also use the optional variables described in `README.md`.

## Coding Style & Naming Conventions

Use TypeScript and the existing Next.js/React patterns. Follow the repository’s double-quoted, semicolon-terminated style and use two spaces for indentation. Use kebab-case for route directories and filenames where practical; React components use PascalCase, and variables/functions use camelCase. Keep API handlers in the corresponding `route.ts` and run `npm run lint` before submitting.

## Testing Guidelines

No automated test framework or test script is currently configured. For changes, run `npm run lint`; run `npm run build` when validating production compilation. For database work, review the generated migration and verify it against a suitable development database before applying it elsewhere.

## Commit & Pull Request Guidelines

Recent commits use short, lowercase, action-oriented summaries (for example, `fix login phone` or `add date and people`); keep each commit focused and concise. Pull requests should explain the user-visible change, list relevant validation commands, link related issues when applicable, and include screenshots for UI changes.

## Security & Configuration

Never commit `.env.local`, credentials, or production data. Keep secrets in environment configuration, and verify the target `DATABASE_URL` before running `npm run db:migrate`.
