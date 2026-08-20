# Deploying SetHub

Everything is already wired up except two steps that need your credentials.

## 1. Push the code

```bash
cd ~/sethub
git push -u origin main
```

The GitHub repo is `gbollynerd/sethub` and the Vercel project `sethub` is
already linked to it, with `main` as the production branch. The push triggers
the first deployment.

> A stray local `master` branch is left over from the transfer. Remove it with
> `git branch -D master` — `main` is the branch that matters.

## 2. Add the environment variables in Vercel

Vercel → **sethub** → Settings → Environment Variables. Add these to
Production, Preview **and** Development:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jzqttnzeraaubjsvxdjc.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_CaO-H3VRh-fDQC1xzaMS6w_gZtVOfmo` |
| `NEXT_PUBLIC_SITE_URL` | your Vercel domain, e.g. `https://sethub.vercel.app` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` |

Do this **before** the first deploy, or redeploy afterwards — the build reads
them at build time.

## 3. Point Supabase Auth at the deployed site

Supabase → Authentication → URL Configuration:

* **Site URL**: `https://<your-vercel-domain>`
* **Redirect URLs**: add `https://<your-vercel-domain>/auth/callback`

Without this, the confirmation email links come back to `localhost`.

## Running locally

```bash
npm install
npm run dev      # http://localhost:3000
```

`.env.local` is already in place with the Supabase URL and anon key. Add the
service-role key there too if you want to run background workers locally.

## Database

The project `sethub` (`jzqttnzeraaubjsvxdjc`) already has the full schema, RLS
policies, storage buckets and the seeded institution directory applied. To
recreate it elsewhere, run `supabase/migrations/*.sql` in numeric order.

## Demo login

* `demo.owner@sethub.test` / `password123` — owner of University of Lagos, Class of 2012
* `demo.member@sethub.test` / `password123` — member, Computer Science department

Clear it out when you're ready:

```sql
delete from auth.users where email like '%@sethub.test';
delete from sets where description = 'Demo set';
```
