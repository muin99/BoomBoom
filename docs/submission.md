# Submission package

Never paste secret values here or into submission fields.

Latest evidence: [judge audit](judge-audit.md). The public service passed 46/46 checks; the fresh GitHub checkout passed 22/22 existing tests, and the expanded local source passed 44/44. New audit tests and documentation remain local until committed and pushed.

| Required item | Final value | State |
|---|---|---|
| Public API base URL | `https://buphack.onrender.com` | **Live.** Deployed on Render, no login/VPN required |
| Health URL | `https://buphack.onrender.com/health` | Verified externally: `200 {"status":"ok"}` |
| Optimization endpoint | `POST https://buphack.onrender.com/optimize-energy` | Verified externally: 10/10 public cases, structural/guardrail edge cases, an engineered infeasible case, and 8 concurrent requests all returned correct, sanitized responses |
| Swagger / OpenAPI | `https://buphack.onrender.com/docs`, `.../docs-json` | Verified externally: UI and all static assets load, spec matches checked-in `docs/openapi.json` |
| GitHub repository | `https://github.com/muin99/BoomBoom` | Authenticated clean clone verified at `3fe7ef7`; unauthenticated fetch returns 404, consistent with private access. Confirm event timing and make public after the submission deadline |
| README/configuration | `README.md`, `.env.example` | Prepared |
| Provider/model | OpenAI / `gpt-4.1-mini-2025-04-14` | Confirmed matching in the deployed Render environment variables |
| Docker registry tag | `onukrom/gridwise:1.0.0` | Pushed to Docker Hub, pulled back fresh, and container-tested with all 10 public cases |
| Image digest | `sha256:10ca66bc808fc81a2e204cd0927b5740a23043bdb81b65420f7728cd81d7b6b3` | Recorded from the pulled image via `docker image inspect` |
| Container port | `3000` | Confirmed in Render service config; binds to `0.0.0.0` |
| Video artifact | `deliverables/gridwise-solution.mp4` | Prepared (172.6s, under the 180s limit, per `docs/verification.md`); not yet uploaded |
| Video link | TO BE UPLOADED | Owner will upload before submission |

## Final checklist

- [ ] Verify repository creation against the organizers' question-reveal time; keep private during the event. Repository exists, but the reveal timestamp was not available for this audit.
- [ ] Team reviewed and understands the solution; dependencies and AI assistance credited.
- [x] Final code passes `npm ci`, `npm test`, and `npm run test:live`.
- [x] Public endpoints work without login/VPN. Tested from this development machine; **run the same checks from a second network/device before judging** to satisfy "outside development environment" (PG §3).
- [ ] Readiness <60s and requests <30s; record uncached p95 and failure rate. **Risk:** the documented Render free plan spins down after inactivity. Cold-start timing was not measured in this audit and may violate the readiness/request budgets (see below).
- [ ] Hosted model, credentials, quota and service remain available during evaluation.
- [x] Registry image pushed, pulled, and tested from the documented commands; exact tag/digest recorded (`onukrom/gridwise:1.0.0`, `sha256:10ca66bc808fc81a2e204cd0927b5740a23043bdb81b65420f7728cd81d7b6b3`).
- [x] `.env` is untracked and `.env.example` is present. Scanning 76 local historical Git blobs found no occurrence of the configured key; the pulled image has no `/app/.env`, and its metadata/history contain no occurrence of that key. A private-repository HTTP 404 alone does not establish secret absence.
- [ ] Video ≤3 minutes, uploaded, and judge access verified. (Duration already verified locally; upload still pending.)
- [ ] Endpoint URL, repository URL, README/configuration, image reference and video submitted. (Endpoint, repository, README and image reference are ready above; video link still outstanding.)
- [ ] Repository made public after submission deadline; all artifacts retained for evaluation.

## Free-tier cold-start risk

The existing deployment record identifies the service as using Render's free plan. [Render documents](https://render.com/docs/free) spin-down after 15 minutes without traffic and a wake-up of about one minute. That creates a material risk against PG §8's <60-second readiness and <30-second request budgets. The current audit verified warm requests, not a deliberate idle/cold-start cycle. Use hosting that remains active during judging and measure cold-start behavior before submission; this audit did not change the hosting plan.

See `docs/deployment.md` for account creation and publishing steps. Local tests do not complete external deployment, registry publication or organizer submission on their own.
