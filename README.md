# Don Bosco Projects

A multilingual project showcase and single-administrator console for Don Bosco Cairo. The app is built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase Auth/Postgres/Storage, and server-side authorization.

The public interface is available at `/en`, `/ar`, and `/it`. The admin sign-in is at `/{locale}/admin`; there is no public registration flow. Public project, team, and student-profile records are only shown when the institute has published/approved them. The repository contains no fabricated project, student, partner, award, or performance-statistic records.

## What is included

- Responsive public homepage, project catalogue/detail pages, department and team listings, industry inquiry form, about and privacy pages.
- English, Arabic (RTL), and Italian translation dictionaries; locale-aware dates and language preference.
- Server-side project search, filters, sorting, pagination, public statistics and sitemap.
- One authorized administrator, Supabase Auth sign-in/password recovery, a dashboard, project publishing workflow, project/department/team/content/inquiry management, and activity logging.
- Supabase migrations with row-level security, narrowly granted database privileges, rate-limited public inquiries, project-view counting, and private Storage buckets.
- Signed/persisted media uploads; server-side type/signature and size checks; orphan cleanup; graceful missing-image fallback.
- The supplied campus photograph and centenary emblem are used as supplied. Programme labels seeded by migration 001 match the technical specializations described on the [institute's published educational-programme page](https://donboscocairo.org/school/educational-program/); their descriptions are blank until the institute supplies approved copy.

## Requirements

- Node.js **20.9 or newer** and npm. `package.json` declares this minimum for Next.js 16.
- A Supabase project for authentication, database and persistent media. The app can start without Supabase credentials for a local UI preview, but database-backed features and admin sign-in will be unavailable until configured.
- Supabase CLI only if using `npm run db:push` (install it using the [official CLI guide](https://supabase.com/docs/guides/local-development/cli/getting-started)).

## Local setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes for deployment | Canonical public origin, sitemap and auth redirect base. Use `http://localhost:3000` locally; use the exact production origin in Vercel. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes for Supabase features | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes for Supabase features | Supabase publishable key. Older projects can instead set `NEXT_PUBLIC_SUPABASE_ANON_KEY`. This browser-visible key is protected by RLS; it is not a service-role secret. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for privileged server-side jobs | Supabase service-role/secret key. Server only; **never** expose it with a `NEXT_PUBLIC_` prefix or commit it. |
| `INQUIRY_HASH_SECRET` | Recommended | Independent random salt for privacy-preserving inquiry rate-limit hashes. |
| `VIEW_HASH_SALT` | Recommended | Independent random salt for project-view hashes. |

Generate the two salts separately with `openssl rand -hex 32`. The application falls back to a server-only key when a salt is absent, but explicit random salts are preferred. The `.env.example` file contains placeholders only. `.env.local` is git-ignored.

Run and validate locally:

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
npm start
```

The production build uses `next build --webpack` for reliable builds in constrained environments. `npm run start` binds to `0.0.0.0`.

## Supabase project setup

### 1. Create the project and configure Auth

Create a Supabase project, then copy its project URL, publishable (or legacy anon) key, and server-only service-role/secret key into the environment variables above. Keep the secret in Vercel server environment variables only.

In Supabase **Authentication → URL Configuration**, set the Site URL to the public site origin and add the callback URLs that will actually be used, for example:

```text
http://localhost:3000/auth/callback
https://your-production-domain.example/auth/callback
```

Add preview callback URLs only if preview deployments will be used for authentication. Configure the email provider and production SMTP before relying on password recovery; test delivery and redirects with a non-production account.

### 2. Apply migrations to a fresh staging database first

The six ordered files in `supabase/migrations/` create the schema, policies, workflows, reporting/content functions, public statistics, and least-privilege grants. Migrations have **not** been run against a live project in this workspace. Review them and apply them to a fresh staging project first; do not replay them blindly over an existing production schema.

Using the official Supabase CLI:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
```

The repository includes a minimal `supabase/config.toml`. The CLI may ask for the database password. Alternatively, in the Supabase SQL Editor, run `001_initial_schema.sql` through `006_privileges.sql` in numeric order, one file at a time, on a fresh project. Check each result before continuing. If a project already has tables or policies, stop and reconcile the schema with a reviewed forward migration rather than relying on `IF NOT EXISTS` to make it safe.

The migrations seed only editable site copy, the single-row statistics configuration, and three programme-area labels based on the technical specializations listed on the official page noted above. They do **not** seed project, team, student, award, partnership, inquiry, or numerical portfolio data. Add real records through the admin console only after the institute approves the copy, images, and publication status.

### 3. Provision exactly one administrator

There is deliberately no public admin registration. First create/invite the intended administrator through **Authentication → Users** in the Supabase dashboard. Disable public sign-ups in the Supabase Auth provider settings. Then, as the database owner in the SQL Editor, add that user's UUID to the allowlist:

```sql
insert into public.admin_allowlist (singleton, user_id)
values (true, 'PASTE_THE_AUTH_USER_UUID_HERE')
on conflict (singleton)
do update set user_id = excluded.user_id;
```

The table enforces one allowlisted user. To transfer access, update that one row to the new Auth user's UUID; do not add a second account. Use a strong unique password and configure secure recovery email delivery. Review the Supabase MFA options and institutional account-recovery policy before production.

### 4. Verify before opening the site

- Confirm the migrations and RLS policies on staging; test as both anonymous and administrator users.
- Confirm draft/pending/archived projects, private team/student records, inquiries and uploaded objects are not publicly readable.
- Publish only institute-approved records; verify all English, Arabic and Italian fields, alt text, consent wording, and public status.
- Test uploads, replacement and deletion against Supabase Storage. The app accepts JPEG/PNG/WebP images up to **8 MB** and PDFs up to **12 MB**. This application limit is intentionally lower than Supabase's listed **50 MB per-file Free-plan maximum**. Media is stored in Supabase Storage, not Vercel's filesystem.
- Test password recovery and its `/auth/callback` redirect, the inquiry flow and rate limit, plus the actual privacy notice and data-retention policy.

## Deployment

### Vercel

1. Import the repository as a Next.js project; use the package scripts and Node.js 20.x or newer (at least 20.9).
2. Add the environment variables above to the correct Vercel Development/Preview/Production environments. Set `NEXT_PUBLIC_SITE_URL` to the corresponding public origin. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
3. Deploy first to a protected preview environment connected to a staging Supabase project. Complete the verification checklist above, then switch Production to the production Supabase project.
4. Add the production domain in Vercel and in Supabase Auth URL Configuration. Retest locale routing, callback redirects, sitemap/robots output, uploads, media reads and inquiry delivery on the deployed domain.
5. Use Supabase Storage for uploads. Do not write user media to local disk: Vercel function filesystems are not a durable upload store.

### Plan and cost guidance (official pages checked 10 October 2026)

These are current public list limits/prices, not a quote. Providers can change quotas, billing rules, regional rates, taxes and eligibility; recheck the linked billing pages before launch.

| Service / plan | Current published details | Deployment guidance |
| --- | --- | --- |
| **Supabase Free** | $0; 500 MB database per project; 1 GB Storage; 50 MB max file upload; 5 GB egress plus 5 GB cached egress; 50,000 MAUs; two active projects. Free projects pause after one week of inactivity. Automatic backups and point-in-time recovery are not included. | Useful for a prototype/staging environment, subject to the pause and quota limits. The app itself limits images to 8 MB and PDFs to 12 MB. Do not treat the Free plan as a backup or uptime guarantee. |
| **Supabase Pro** | From $25/month; first project included, with $10/month compute credits; 100,000 MAUs, 8 GB database disk, 250 GB egress and cached egress, 100 GB Storage, and daily backups retained 7 days (overages/additional resources may cost extra). | Prefer for production because projects do not pause and daily backups are included. Confirm the total with the Supabase billing calculator and set usage alerts; also keep an independent backup/restore plan for institutional data. |
| **Vercel Hobby** | $0; published examples include 100 GB/month fast data transfer, 1 million function invocations, 4 Active CPU hours and 360 GB-hours provisioned memory. | Vercel restricts Hobby to **non-commercial personal use only**. This is an institutional public platform, not a personal project. If paid employees/consultants are involved in producing it, or any other part of Vercel's commercial-use definition applies, Hobby is ineligible. Do not assume it qualifies; ask Vercel Support if the arrangement is unclear. |
| **Vercel Pro** | Listed at $20/month with $20 of included usage credit; additional usage, developer seats and applicable taxes can affect the bill. | Recommended baseline if Hobby eligibility is not confirmed. Review spend-management settings and the live plan page before adding seats or production traffic. |

For this institute-facing deployment, budget on **Supabase Pro + Vercel Pro** unless the institute independently confirms Free/Hobby suitability with the providers. The listed base prices are not a complete invoice estimate: domain, SMTP provider, extra seats, compute, usage and taxes may add costs. See the official [Supabase pricing](https://supabase.com/pricing), [Vercel pricing](https://vercel.com/pricing), and [Vercel Fair Use Guidelines](https://vercel.com/docs/limits/fair-use-guidelines). Vercel's Hobby restriction and definition of commercial usage are described in its own policy; if eligibility is uncertain, get written guidance from Vercel before deployment.

## Security and privacy notes

- Authorization is enforced server-side for admin API mutations and checked against the single-row allowlist. Public server-rendered reads use a separate anon-key client (rather than inheriting a logged-in administrator's cookies), so public pages continue to obey public RLS even in an admin browser. RLS remains enabled for database tables; Storage buckets are private and mediated by the app's signed-media endpoints.
- Public inquiries are consent-gated and rate-limited. Avoid collecting unnecessary personal data, define retention/deletion rules, and have the institute review the privacy page and applicable Egyptian/institutional obligations.
- The service-role key bypasses normal RLS protections; keep it in server-only deployment variables, rotate it if exposed, and never put it in client-side code, issue screenshots, or public logs.
- The public showcase contains no demo student profiles or portfolio claims. A newly migrated database is not ready for publication until its administrator has verified the content and settings.

## Tests and verification

- `npm run test`: focused unit tests for three-locale dictionary parity, locale fallback, upload-signature checks, validation, and inquiry consent.
- `npm run lint`: ESLint flat config with TypeScript, React, React Hooks and JSX accessibility rules.
- `npm run typecheck`: TypeScript strict check.
- `npm run build`: production Next.js build.
- `npm audit`: dependency audit.
- Migration smoke check: all six SQL files were applied to an in-memory PGlite PostgreSQL-compatible engine with minimal `auth`/`storage` stubs; the `pgcrypto` extension statement was skipped because the test engine already provides `gen_random_uuid()`. Anonymous project search and the allowlisted-admin list/detail/overview RPCs were exercised. This is a useful syntax/permission smoke test, not a substitute for running the migrations on Supabase.

These checks validate the code in this repository; they do not prove a live Supabase deployment. SQL migrations, Auth recovery/email delivery, Supabase-specific RLS/Storage behavior and production billing still require verification against a real staging project. A manual visual/accessibility pass across 320–1920 px, Arabic/Italian long-copy layouts, keyboard navigation and screen readers has not been completed in this workspace. No live Supabase credentials or Vercel deployment are included.
