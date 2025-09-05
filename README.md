# AutoStand v2

Modern, multi-tenant SaaS scaffold: React + Vite + Tailwind + Supabase.

## Apps
- **apps/web**: frontend (Vite)
- **apps/api**: optional functions/health (Netlify, TypeScript)
- **db/**: SQL migrations (core, RLS, seeds)

## Quick start
```bash
pnpm install

cp apps/web/.env.local.example apps/web/.env.local
pnpm -C apps/web dev

pnpm -C apps/api dev
