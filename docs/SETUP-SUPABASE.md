# Connecting Supabase

The app runs on local seed data until these steps are done. Once configured, it
reads trails and reviews from Postgres automatically (see `src/lib/trails-repo.ts`).

## 1. Create the project
1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. Wait for it to provision (~2 min).

## 2. Create the schema
In the dashboard → **SQL Editor** → paste the contents of
[`supabase/schema.sql`](../supabase/schema.sql) → **Run**.

This enables PostGIS, creates `trails` + `reviews`, sets Row Level Security, and
adds the `trails_nearby()` function. Trail geometry is stored as GeoJSON in
`jsonb`, with PostGIS `geometry` columns generated from it for spatial queries.

## 3. Enable anonymous reviews
The review form uses Supabase **anonymous sign-in** so visitors can post without
a full login. Enable it: **Authentication → Sign In / Providers → Anonymous
sign-ins → ON**.

## 4. Add your keys
Dashboard → **Project Settings → API**. Copy into `.env.local` (create it from
`.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>   # only for the import script
```

Restart `npm run dev`.

## 5. Load real trail data
```bash
node scripts/import-osm.mjs              # fetch Albanian routes → data/osm-trails.json
node scripts/import-osm.mjs --elevation  # (optional, slow) also compute ascent
node scripts/import-osm.mjs --push       # upsert into Supabase (uses service role key)
```

The importer pulls `route=hiking` relations from OpenStreetMap. The bbox is
rectangular so a few cross-border routes (Montenegro/Greece/N. Macedonia) come
along — curate `data/osm-trails.json` and fill the `TODO` editorial fields
(summary, difficulty, region, logistics) before pushing, or push all and edit in
the dashboard.

## Verifying
- With keys set, the home page and trail pages read from Supabase; without them
  they silently fall back to seed data (you'll see a console warning).
- Post a review on any trail — it should appear immediately and persist on reload.
