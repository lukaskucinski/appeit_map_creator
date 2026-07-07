# Dev / Prod Environment Split

The Modal backend supports a fully isolated dev stack via a single env var,
`PEIT_ENV`. In dev, the app name, Volume, rate-limit Dicts, and Secrets are all
suffixed (`-dev`), so dev runs never read or write production data — **nothing
to clean up afterward**.

- **Prod (default):** `modal deploy modal_app.py`
- **Dev:** `PEIT_ENV=dev modal serve modal_app.py` (or `modal deploy` for a persistent dev URL)

`PEIT_ENV` is read at import time on the client (when the CLI builds the app
graph), so it only needs to be set in the shell you run Modal from. Leave it
unset for prod — behavior is unchanged.

What gets suffixed automatically (Dicts + Volume auto-create on first use):

| Prod name | Dev name (`PEIT_ENV=dev`) | Auto-created? |
|---|---|---|
| app `peit-processor` | `peit-processor-dev` | yes |
| Volume `peit-results` | `peit-results-dev` | yes |
| Dict `peit-rate-limits` | `peit-rate-limits-dev` | yes |
| Dict `peit-user-rate-limits` | `peit-user-rate-limits-dev` | yes |
| Dict `peit-active-jobs` | `peit-active-jobs-dev` | yes |
| Dict `peit-global-rate-limit` | `peit-global-rate-limit-dev` | yes |
| Secret `vercel-blob` | `vercel-blob-dev` | **no — you create it** |
| Secret `supabase-service` | `supabase-service-dev` | **no — you create it** |
| Secret `resend-api` | *(omitted in dev)* | n/a — dev sends no emails |

---

## One-time setup (~30–45 min)

### 1. Dev Supabase project (job tracking + Map History + auth)
1. Create a new Supabase project (the free tier is fine) — this is your dev DB.
2. Recreate the schema. The repo captures part of it under
   `peit-app-homepage/supabase/migrations/`, but some was applied via the
   dashboard/MCP, so the migrations alone are **incomplete**. Easiest reliable path:
   ```bash
   # from a machine linked to PROD, dump the public schema:
   supabase db dump --schema public -f schema.sql
   # then link to the DEV project and apply it:
   supabase link --project-ref <dev-project-ref>
   supabase db push   # or: psql <dev-connection-string> -f schema.sql
   ```
   This brings over the `jobs`, `jobs_active`, `user_stats` tables plus their
   triggers and RLS policies. (The welcome/admin-notification Edge Functions are
   optional in dev — skip unless you're testing them.)
3. Grab the dev project's URL, anon key, and service-role key.

### 2. Dev Vercel Blob store (map / report hosting)
1. In the Vercel dashboard, create a **second** Blob store (e.g. `peit-dev`).
2. Copy its `BLOB_READ_WRITE_TOKEN`.

### 3. Create the dev Modal secrets
```bash
modal secret create vercel-blob-dev BLOB_READ_WRITE_TOKEN=<dev-blob-token>
modal secret create supabase-service-dev \
  SUPABASE_URL=<dev-supabase-url> \
  SUPABASE_SERVICE_ROLE_KEY=<dev-service-role-key>
```

### 4. Deploy (or serve) the dev backend
```bash
# persistent dev URL (recommended — stable, set-and-forget):
PEIT_ENV=dev modal deploy modal_app.py
#   -> https://<workspace>--peit-processor-dev-fastapi-app.modal.run

# or ephemeral, hot-reloading, for backend iteration:
PEIT_ENV=dev modal serve modal_app.py
```
On PowerShell: `$env:PEIT_ENV="dev"; modal deploy modal_app.py`

### 5. Point the local frontend at dev
Create `peit-app-homepage/.env.development.local` (git-ignored; loaded **only**
by `npm run dev`, and it overrides `.env.local`, so prod builds are untouched):
```
NEXT_PUBLIC_MODAL_API_URL=<dev modal url from step 4>
NEXT_PUBLIC_SUPABASE_URL=<dev supabase url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dev anon key>
SUPABASE_SERVICE_ROLE_KEY=<dev service-role key>   # used by the /maps route lookup
BLOB_READ_WRITE_TOKEN=<dev blob token>             # used by the /maps route fallback
```

---

## Daily use (after setup)

```bash
# terminal 1 — backend (only if iterating on Python; otherwise the deployed dev app is enough)
PEIT_ENV=dev modal serve modal_app.py

# terminal 2 — frontend, automatically uses .env.development.local
cd peit-app-homepage && npm run dev
```

Then use the app at `http://localhost:3000`. Everything — processing, Map
History, live maps, downloads — runs against the dev stack. **Nothing touches
prod, so there is nothing to clean up.**

- To view a generated dev map directly: `http://localhost:3000/maps/<job_id>`.
  (The stored "View Live Map" link still shows the prod domain — cosmetic only in
  dev; use the localhost URL.)
- Prod is unaffected: shipping prod is still `modal deploy modal_app.py` (no
  `PEIT_ENV`) and the normal Vercel deploy.

## Rollback / safety
- Prod resources and behavior are unchanged when `PEIT_ENV` is unset.
- The dev app is a separate Modal app, so `PEIT_ENV=dev modal deploy` can never
  overwrite the prod app, and prod `modal deploy` can never touch dev.
