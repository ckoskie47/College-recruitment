# Elevate Fiduciary Workspace

A collaborative procurement workspace for benefits broker RFPs and any high-stakes vendor selection requiring a documented fiduciary record.

**Full product spec, architecture, data model, and design system:** see [`CLAUDE.md`](./CLAUDE.md). That file is the source of truth for the build.

---

## Quick Start

### Prerequisites

- Node.js 20+ and pnpm
- A Supabase project (schema already applied via `supabase/schema.sql`)
- An Anthropic API key
- A Resend account (for invitation emails — can defer)

### First-time setup

```bash
# 1. Clone
git clone https://github.com/YOUR-ORG/elevate-fiduciary.git
cd elevate-fiduciary

# 2. Environment
cp .env.example .env.local
# Edit .env.local and fill in your Supabase / Anthropic keys

# 3. Install (after Claude Code bootstraps the Next.js project)
pnpm install

# 4. Generate Supabase types (after schema is applied)
npx supabase gen types typescript --project-id YOUR_PROJECT_REF > lib/supabase/types.ts

# 5. Run locally
pnpm dev
# Visit http://localhost:3000
```

---

## Repo Layout

```
.
├── CLAUDE.md                    # Product spec, architecture, design system, conventions
├── README.md                    # This file
├── .env.example                 # Template for .env.local
├── .gitignore
├── supabase/
│   ├── schema.sql               # Initial schema (16 tables, RLS, helpers, seed data)
│   └── storage_policies.sql     # Storage RLS for 3 buckets
└── reference/
    └── prototype.html           # Visual source of truth — match this for design decisions

# After Claude Code bootstrap, you'll also see:
# app/, components/, lib/, types/, public/, tailwind.config.ts, next.config.ts, etc.
```

---

## Database Setup (one-time, already done if you ran the SQL)

1. Create a Supabase project at [app.supabase.com](https://app.supabase.com)
2. SQL Editor → paste `supabase/schema.sql` → Run
3. Storage → create three buckets: `engagement-documents`, `meeting-recordings`, `exports` (all private, 50 MB limit)
4. SQL Editor → paste `supabase/storage_policies.sql` → Run
5. Copy URL + anon key + service role key from Settings → API into `.env.local`

---

## Deployment

Deploys to Netlify automatically on push to `main`. Preview URLs are generated for every PR.

Required environment variables in Netlify Site Settings → Environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL` (the Netlify URL or custom domain)

---

## Working with Claude Code

Open a terminal in the repo root and start Claude Code:

```bash
cd elevate-fiduciary
claude
```

Claude Code automatically reads `CLAUDE.md` at session start — it contains the product spec, architecture, design system, vocabulary, and code conventions. Every prompt builds on that context.

Recommended first prompts in order:

1. *Bootstrap a Next.js 15 App Router project per CLAUDE.md. TypeScript strict, Tailwind, Supabase client, shadcn/ui, design tokens.*
2. *Implement Supabase auth: email magic link + Google OAuth, with a `(auth)` route group and middleware that protects `(workspace)` routes.*
3. *Build the workspace shell: topbar matching `reference/prototype.html` brand, sidebar with the 7-stage stepper, engagement dashboard.*
4. *Build the collaborative scorecard view: per-stakeholder scoring with divergence flags.*
5. *Build the proposal analysis pipeline: PDF upload → Claude API → structured findings in `documents.ai_summary`.*

After Claude Code generates code, review the diff, then commit and push:

```bash
git add .
git commit -m "feat: <what you built>"
git push origin main
```

---

## License

Proprietary. © Elevate Advisor Group.
