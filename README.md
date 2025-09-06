Modern, multi-tenant SaaS scaffold: React + Vite + Tailwind + Supabase.

## Apps
- `apps/web`: frontend (Vite)
- `apps/api`: optional functions/health (Netlify, TypeScript)
- `supabase/db/`: SQL migrations (core, RLS, seeds)

## Quick start
```bash
pnpm install
cp apps/web/.env.local.example apps/web/.env.local
pnpm -C apps/web dev
pnpm -C apps/api dev
```

## Supabase setup

1) Create a project at https://supabase.com
2) Project Settings → API: copy the Project URL and anon public key.
3) Put them in `apps/web/.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4) Apply database schema: open the SQL Editor in Supabase and run the files under:
   - `supabase/db/migrations/schema.sql`
   - `supabase/db/migrations/0003_seed.sql` (optional demo data)

Run the web app:
```bash
pnpm -C apps/web dev
```