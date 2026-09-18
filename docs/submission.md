# Submission package

Never paste secret values here or into submission fields.

| Required item | Final value | State |
|---|---|---|
| Public API base URL | `https://buphack.onrender.com` | **Live.** Deployed on Render, no login/VPN required |
| Health URL | `https://buphack.onrender.com/health` | Verified externally: `200 {"status":"ok"}` |
| Optimization endpoint | `POST https://buphack.onrender.com/optimize-energy` | Verified externally: 10/10 public cases, structural/guardrail edge cases, an engineered infeasible case, and 8 concurrent requests all returned correct, sanitized responses |
| Swagger / OpenAPI | `https://buphack.onrender.com/docs`, `.../docs-json` | Verified externally: UI and all static assets load, spec matches checked-in `docs/openapi.json` |
| GitHub repository | `https://github.com/muin99/BoomBoom` | Private (confirmed 2026-09-18: unauthenticated fetch returns 404). Switch to public only after the submission deadline |
| README/configuration | `README.md`, `.env.example` | Prepared |
| Provider/model | OpenAI / `gpt-4.1-mini-2025-04-14` | Confirmed matching in the deployed Render environment variables |
| Docker registry tag | `onukrom/gridwise:1.0.0` | Pushed to Docker Hub, pulled back fresh, and container-tested with all 10 public cases |
| Image digest | `sha256:10ca66bc808fc81a2e204cd0927b5740a23043bdb81b65420f7728cd81d7b6b3` | Recorded from the pulled image via `docker image inspect` |
| Container port | `3000` | Confirmed in Render service config; binds to `0.0.0.0` |
| Video artifact | `deliverables/gridwise-solution.mp4` | Prepared (172.6s, under the 180s limit, per `docs/verification.md`); not yet uploaded |
| Video link | TO BE UPLOADED | Owner will upload before submission |

## Final checklist

- [x] Repository created after question reveal, private during event.
- [ ] Team reviewed and understands the solution; dependencies and AI assistance credited.
- [x] Final code passes `npm ci`, `npm test`, and `npm run test:live`.
- [x] Public endpoints work without login/VPN. Tested from this development machine; **run the same checks from a second network/device before judging** to satisfy "outside development environment" (PG §3).
- [ ] Readiness <60s and requests <30s; record uncached p95 and failure rate. **Risk:** the Render service is on the free ($0/month) plan, which spins down after inactivity — a cold start after spin-down can take well over 60s and break this requirement mid-judging. Confirm the plan before submission (see note below).
- [ ] Hosted model, credentials, quota and service remain available during evaluation.
- [x] Registry image pushed, pulled, and tested from the documented commands; exact tag/digest recorded (`onukrom/gridwise:1.0.0`, `sha256:10ca66bc808fc81a2e204cd0927b5740a23043bdb81b65420f7728cd81d7b6b3`).
- [x] No credentials in repository: `.env` confirmed absent from `github.com/muin99/BoomBoom` (raw fetch 404), `.env.example` present as expected.
- [ ] Video ≤3 minutes, uploaded, and judge access verified. (Duration already verified locally; upload still pending.)
- [ ] Endpoint URL, repository URL, README/configuration, image reference and video submitted. (Endpoint, repository, README and image reference are ready above; video link still outstanding.)
- [ ] Repository made public after submission deadline; all artifacts retained for evaluation.

## Free-tier cold-start risk

The Render service was created on the **$0/month free plan** (0.1 CPU / 512 MB, spins down after inactivity). A judge hitting it after it has spun down will see a cold start that can exceed both the 60-second readiness budget and the 30-second per-request budget in PG §8. Upgrade to a paid plan (e.g. $7/month, no spin-down) before judging starts if this budget matters for your score, or be prepared for the first hidden-judge request to be slow.

See `docs/deployment.md` for account creation and publishing steps. Local tests do not complete external deployment, registry publication or organizer submission on their own.
