# SetHub

A digital alumni workspace. **One person → one account → many independent school
communities.** Each graduating set runs as its own private workspace, and inside a
university set each **department** is a closed sub-community with its own channels,
announcements, events and dues.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4 and Supabase.
Deploys to Vercel.

---

## The architectural rule

> Never assume a user belongs to only one school or set. A user owns one global
> platform account but may have many independent set memberships. All roles,
> permissions, EXCO positions, groups, channels, dues, financial records, events,
> elections and private content are scoped to the relevant set membership.
> School-wide projects are scoped to the institution and can span multiple sets.

This is enforced in the database, not just in the UI. Every table carries a
`set_id`, and 170+ row-level-security policies gate reads and writes on active
membership. A member of *FGC Lagos — Class of 2008* cannot see a single row from
*University of Lagos — Class of 2012*, even if they belong to both.

```
PLATFORM ACCOUNT (profiles)
  ├── Membership → FGC Lagos          · Class of 2008 · House, hostel, prefect
  ├── Membership → University of Lagos · Class of 2012 · Department, faculty, course
  │       └── Department → Computer Science  (closed sub-community)
  └── Membership → Yaba Tech           · Class of 2015

INSTITUTION → many sets → school-wide PROJECTS (the one deliberate exception)
```

---

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in the Supabase keys
npm run dev
```

### Environment

| Variable | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server Supabase clients |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server Supabase clients |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only — background workers, never sent to the browser |
| `NEXT_PUBLIC_SITE_URL` | Invite links and auth redirect URLs |
| `WHATSAPP_*`, `TELEGRAM_BOT_TOKEN` | Outbound integration worker |
| `PAYSTACK_SECRET_KEY`, `FLUTTERWAVE_SECRET_KEY` | Payment gateways (optional) |

### Database

The full schema lives in `supabase/migrations/`, numbered in dependency order.
Apply it with the Supabase CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```

Or paste each file into the SQL editor in order. `0017_seed.sql` loads a starter
directory of 40 Nigerian institutions with faculties, departments, houses,
hostels and prefect positions.

---

## What is in the box

| Area | Where |
| --- | --- |
| Marketing site | `src/app/page.tsx` |
| Auth (sign up, sign in, reset, email confirm) | `src/app/(auth)/`, `src/app/auth/callback/` |
| Onboarding — find school, join or create a set, pick a department | `src/app/onboarding/`, `src/components/onboarding/` |
| Invite landing page | `src/app/invite/[token]/` |
| Community switcher (Slack-style) | `src/components/shell/workspace-switcher.tsx` |
| Set workspace | `src/app/s/[setId]/` |
| Departments as sub-communities | `src/app/s/[setId]/departments/` |
| Chat with realtime | `src/app/s/[setId]/chat/`, `src/components/chat/` |
| Finances, dues, expenses, ledger, export | `src/app/s/[setId]/finances/`, `src/app/api/sets/[setId]/finance/export/` |
| Elections with secret ballots | `src/app/s/[setId]/elections/`, `src/components/elections/` |
| School-wide projects | `src/app/s/[setId]/projects/` |
| Administration, invites, integrations, audit | `src/app/s/[setId]/admin/` |
| Design system | `src/app/globals.css` |
| Icon set (hand-drawn duotone SVG) | `src/components/icons.tsx` |

---

## Feature notes

### Departments
A university set mirrors its institution's department catalogue on creation.
Each department automatically gets `#<slug>-general` and `#<slug>-announcements`
as **private** channels, plus three department roles (admin, coordinator, member).
Department administrators can issue their own invite links, post their own
announcements, run their own events and levy their own dues — while everyone
keeps full access to the set-wide space.

Turn the whole layer off per set with `sets.departments_enabled`.

### Invites
`create_invite()` mints a token, a short human-readable code (`UNILAG2012-4KQ9E`)
and — in the UI — a downloadable QR. Scope is `set`, `department`, `group` or
`channel`. Options: max uses, expiry, auto-approve, and a role to grant on
redemption. Both set administrators (`members.invite`) and department
administrators can issue them.

### Permissions
Three separate concepts, deliberately not collapsed:

* **Owner** — exactly one person, transferable, with a recorded history.
* **EXCO** — elected or appointed office. Grants nothing by itself.
* **Roles** — the actual permission grants (57 keys across 11 categories).

A role can be set-wide or scoped to one department. `app.permissions_for()`
resolves the effective set, and `app.has_perm()` backs every policy.

### Money
`payments` and `expenses` write to a single `ledger_entries` table by trigger —
income only on `confirmed` payments, expense only on `approved` expenses. Members
see the balance and the ledger; detail is permissioned. Export CSV/JSON from
`/api/sets/:setId/finance/export`, or open the printable report and save it as
PDF. Every export is logged in `finance_exports`.

### Integrations
`integrations` + `integration_deliveries` form an outbound queue. A trigger fans
out every published announcement to each active integration subscribed to
`announcement.created`. A worker (Edge Function or cron) drains the queue and
marks each row `sent` or `failed`. WhatsApp, Telegram, Slack, email, SMS and
generic webhooks are modelled the same way.

### Elections
`cast_election_ballot()` writes the whole ballot atomically and returns a
receipt. For anonymous elections the voter link is deliberately dropped — the
receipt proves *that* you voted, never *how*. Results stay sealed until
`results_published_at` is set.

---

## Demo data

The live database contains a small worked example so the UI is not empty:

* `demo.owner@sethub.test` / `password123` — owner of *University of Lagos, Class of 2012*
* `demo.member@sethub.test` / `password123` — member, in the Computer Science department

Remove it whenever you like:

```sql
delete from auth.users where email like '%@sethub.test';
delete from sets where description = 'Demo set';
```

---

## Deploying

1. Push to GitHub.
2. Import the repository in Vercel (framework auto-detects as Next.js).
3. Add the environment variables from `.env.example` to the Vercel project.
4. In Supabase → Authentication → URL Configuration, set the site URL to your
   Vercel domain and add `https://<domain>/auth/callback` as a redirect URL.

---

## Roadmap

Everything in the schema is ready for these; the UI is not built yet:

* Quiz playing and scoring UI (tables and leaderboard already exist)
* Album and document upload against Supabase Storage (buckets and policies exist)
* Donation campaign pages and Paystack/Flutterwave webhooks
* Platform-admin console for school recommendations and moderation
* WhatsApp delivery worker (queue and schema exist)
* React Native app on the same Supabase backend
