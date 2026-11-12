# Debatify

**Debate research and preparation workspace**

A portfolio edition of Debatify’s Next.js application: evidence search, rich-text card preparation, argument workflows, accounts, subscriptions and office-hours experiments. The original application source is preserved with a **key-free local demo** as the default entry point.

This is a fresh, sanitized repository. It contains no production credentials, user database, scraped evidence corpus or inherited Git history.

## Try the demo

Use Node.js **22.22+** (or a supported newer LTS) and npm.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Search the fictional practice cards, bookmark them and draft an argument. These interactions run in browser memory and reset on refresh; they do not call a model, database, billing service or voice agent.

`DEBATIFY_INTEGRATIONS_ENABLED` defaults to disabled. In this mode, integration/API requests return a clear 503 response and account/dashboard routes redirect to the local demonstration. Do not enable integrations just to view the portfolio.

## What is in the source

| Area | Implementation | Included behavior / dependency |
|---|---|---|
| Evidence workspace | `app/main/` | Search, contentions, block files and bookmarks; original evidence backend is separate |
| Card preparation | `app/main/cut/` | Rich-text editing with Tiptap |
| Argument tools | `app/api/`, `app/main/` | Model-assisted generation, extension and theory experiments |
| Identity and storage | `utils/supabase/`, `app/account/` | Supabase auth and application queries |
| Billing | `utils/stripe/`, webhook routes | Stripe checkout, subscriptions and product synchronization |
| Office hours | `app/main/office-hours/`, `utils/livekit.ts` | LiveKit room and agent-integration source |
| Offline portfolio demo | `app/components/portfolio-demo.tsx` | Synthetic practice cards, local filtering/bookmarks and draft editor |

The demo illustrates the workflow; it is not a simulation of authenticated production integrations or a claim that those services are available in this repository.

## Repository layout

```text
app/                    Next.js App Router pages and API handlers
  components/           Shared UI, original landing page and local demo
  main/                 Original debate workspace features
  account/              Auth flows
  api/                  Server integrations and generation routes
pages/api/              Legacy Stripe webhook
utils/                  Supabase, Stripe, LiveKit and shared helpers
public/                 Application icons and owned visual assets
types_db.ts             Original database type definitions (not a migration)
docs/                   Architecture, setup boundaries and verification
licenses/               Preserved third-party template notice
.env.example            Empty configuration fields; no live values
```

The existing route structure is retained to keep imports and links understandable. Local files, old snapshots, deployment identity, proprietary font files, caches and dependencies are excluded.

## Optional integration setup

See [integration setup](docs/integrations.md) before enabling external services. You need your own development database and provider accounts. The repository does **not** include a complete database migration/RLS policy set, the separate evidence backend, provider accounts or the deployed LiveKit agents.

`types_db.ts` documents table shapes only. It is not sufficient to create a secure Supabase project. The original AI/web-search path also contains an incomplete OpenAI client reference (`oai`); it is retained as a known source limitation and is not advertised as working. The default offline demo does not load or execute this path.

Enabling integrations is an opt-in for further development, not a production-ready setup switch. Review auth, authorization, rate limits, external URL fetching, logging and provider terms before exposing the service publicly. No live AI, billing, database or voice calls were used to validate this repository.

## Development

```sh
npm run typecheck
npm run build
npm start
```

The build uses webpack for predictable compatibility with the original application. Provider clients needed at import time were made lazy so a no-key build can complete. The portfolio demo does not require a network-fetched font or analytics.

See [verification notes](docs/verification.md) for checks and scope. See [SECURITY.md](SECURITY.md) for handling credentials.

## Attribution

Application work by Christopher Tang. Some subscription/billing scaffolding follows Vercel’s `nextjs-subscription-payments` template; its MIT notice is preserved in [licenses/nextjs-subscription-payments.txt](licenses/nextjs-subscription-payments.txt). Package dependencies retain their own licenses. This repository does not assert a new blanket license over all application code and assets.
