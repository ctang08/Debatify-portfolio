# Integration setup and boundaries

The default setting is `DEBATIFY_INTEGRATIONS_ENABLED=false`. Keep it that way for a portfolio preview. All values in `.env.example` are blank except the local site URL and this disabled flag; copy it to the ignored `.env.local` if needed.

## Service map

| Service | Configuration | Additional work |
|---|---|---|
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Create your own schema and review RLS policies; no production dump or migrations included |
| Evidence API | `NEXT_PUBLIC_EVIDENCE_API_URL` | Deploy your own search/contention/rebuttal backend; no live URL or corpus is supplied |
| Stripe | `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Use test mode; configure one webhook flow and review duplicate legacy/app webhook implementations |
| Brave | `BRAVE_API` | Your subscription, rate limits and source-use review |
| Vertex AI | `VERTEXPROJECT`, `VERTEXLOCATION`, `VERTEXMODEL`, `EXTENDIFYMODEL`, `GOOGLECREDENTIALS` | Your project/model access; existing code expects base64 service-account JSON in GOOGLECREDENTIALS |
| OpenAI search experiment | `OPENAI_API_KEY`, `OPENAI_SEARCH_MODEL` | Original source references an undefined `oai` client; finish and validate this adapter before use |
| Upstash | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Development Redis instance for request limits |
| LiveKit | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` | Your rooms/agents, identity checks and room access policy |
| Agent warmup | Optional `LIVEKIT_WARMUP_*_URL` values | Your own server-side endpoints; original production URLs were removed |
| Site URLs | `NEXT_PUBLIC_SITE_URL` | Local default is http://localhost:3000 |

Only `NEXT_PUBLIC_*` variables may reach browser bundles. Never put service-role keys, billing secrets, AI keys or private credentials in those fields. The anonymous Supabase key is intended for clients only when RLS is correctly configured. Keep all secret-bearing values in ignored local configuration or your hosting secret manager.

The original source supports optional `_LIVE` Stripe overrides; prefer the ordinary variables with test credentials for local development. Do not supply live billing keys merely to preview this portfolio.

## Known application boundaries

- The offline demo has three fictional cards and no persistent storage.
- The original evidence backend and corpus are absent.
- Database types do not include authorization policies or full provisioning.
- The Sona text route currently returns a placeholder reply; voice output and LiveKit require separate services.
- The OpenAI search client reference in `app/api/ai.js` is incomplete.
- Model output is not verified evidence. Any generated quotation or citation needs independent checking.
- Existing scraping and voice endpoints need additional authorization/abuse review before a public live deployment.
- External integrations have not been end-to-end tested in this sanitized checkout.
