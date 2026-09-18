# Submission package

Never paste secret values here or into submission fields.

Latest evidence: [judge audit](judge-audit.md) and the DianaHost audit below. The current live service (`https://bup.onukrom.xyz`) passed 46/46 judge-audit checks on 2026-09-18; the fresh GitHub checkout passed 22/22 existing tests, and the expanded local source passed 44/44. New audit tests and documentation remain local until committed and pushed.

| Required item | Final value | State |
|---|---|---|
| Public API base URL | `https://bup.onukrom.xyz` | **Live.** Deployed via DianaHost cPanel (Node.js 20.20.2, Passenger), no login/VPN required |
| Health URL | `https://bup.onukrom.xyz/health` | Verified externally: `200 {"status":"ok"}` |
| Optimization endpoint | `POST https://bup.onukrom.xyz/optimize-energy` | Verified externally: 46/46 judge-audit checks (10 public cases, 18 language/energy edge cases, structural/guardrail failures, an engineered infeasible case, concurrency) all returned correct, sanitized responses |
| Swagger / OpenAPI | `https://bup.onukrom.xyz/docs`, `.../docs-json` | Verified externally: UI and all static assets load, spec matches checked-in `docs/openapi.json` byte-for-byte |
| GitHub repository | `https://github.com/muin99/BoomBoom` | Authenticated clean clone verified at `3fe7ef7`; unauthenticated fetch returns 404, consistent with private access. Confirm event timing and make public after the submission deadline |
| README/configuration | `README.md`, `.env.example` | Prepared |
| Provider/model | OpenAI / `gpt-4.1-mini-2025-04-14` | Confirmed matching in the DianaHost application's environment variables |
| Docker registry tag | `onukrom/gridwise:1.0.0` | Reproducibility fallback: pushed to Docker Hub, pulled back fresh, and container-tested with all 10 public cases |
| Image digest | `sha256:10ca66bc808fc81a2e204cd0927b5740a23043bdb81b65420f7728cd81d7b6b3` | Recorded from the pulled image via `docker image inspect` |
| Container port | `3000` | Docker/Render reproducibility path only; the live DianaHost service is routed by Passenger, not a raw container port |
| Video artifact | `deliverables/gridwise-solution.mp4` | Prepared (172.6s, under the 180s limit, per `docs/verification.md`); not yet uploaded |
| Video link | TO BE UPLOADED | Owner will upload before submission |

Render deployment (`https://buphack.onrender.com`) remains fully reproducible and was previously verified with the same 46/46 judge-audit checks; it is documented as a backup path in `README.md` and `docs/deployment.md`, not the submitted endpoint.

## Final checklist

- [ ] Verify repository creation against the organizers' question-reveal time; keep private during the event. Repository exists, but the reveal timestamp was not available for this audit.
- [ ] Team reviewed and understands the solution; dependencies and AI assistance credited.
- [x] Final code passes `npm ci`, `npm test`, and `npm run test:live`.
- [x] Public endpoints work without login/VPN. Tested from this development machine; **run the same checks from a second network/device before judging** to satisfy "outside development environment" (PG §3).
- [x] Readiness <60s and requests <30s. Live judge audit against `https://bup.onukrom.xyz` on 2026-09-18: 46/46 checks passed, optimization p95 **5156 ms**, all requests well under 30s. Shared cPanel/Passenger hosting can still recycle an idle application; see the note below.
- [ ] Hosted model, credentials, quota and service remain available during evaluation.
- [x] Registry image pushed, pulled, and tested from the documented commands; exact tag/digest recorded (`onukrom/gridwise:1.0.0`, `sha256:10ca66bc808fc81a2e204cd0927b5740a23043bdb81b65420f7728cd81d7b6b3`).
- [x] `.env` is untracked and `.env.example` is present. Scanning 76 local historical Git blobs found no occurrence of the configured key; the pulled image has no `/app/.env`, and its metadata/history contain no occurrence of that key. A private-repository HTTP 404 alone does not establish secret absence.
- [ ] Video ≤3 minutes, uploaded, and judge access verified. (Duration already verified locally; upload still pending.)
- [ ] Endpoint URL, repository URL, README/configuration, image reference and video submitted. (Endpoint, repository, README and image reference are ready above; video link still outstanding.)
- [ ] Repository made public after submission deadline; all artifacts retained for evaluation.

## Shared-hosting idle-recycling risk

The live service runs under cPanel's Node.js/Passenger application manager on DianaHost, which can recycle an idle application process; a request after idle time may be slower than a warm one, similar in kind to (though generally milder than) Render's free-plan spin-down. The judge-audit run above measured warm-path latencies (p95 5156 ms), not a deliberate idle/cold-start cycle. Keep the application warm during judging if possible, and re-measure a cold first request before relying on this timing.

See `docs/deployment.md` for account creation and publishing steps. Local tests do not complete external deployment, registry publication or organizer submission on their own.
