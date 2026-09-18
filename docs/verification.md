# Verification evidence

Recorded 2026-09-18T13:40:52.839Z. Real model: `gpt-4.1-mini-2025-04-14`. No key values are included.

## Post-refactor re-verification (2026-09-18T14:01Z)

The flat `src/*.ts` layout described in earlier notes below was reorganized into the NestJS module/controller/service tree documented in `docs/architecture.md` (`energy`, `interpretation`, `health`, `config` and `common` modules). All checks below were rerun against the reorganized source with no behavior changes intended:

- `npm run build` succeeds with the modular `src/` tree.
- All 22 offline tests pass unchanged (`node --test test/*.test.cjs`).
- Real OpenAI live suite: **14/14 cases pass** (ten public cases plus four paraphrases) through the reorganized NestJS app; measured p95 4365 ms in this run.
- A fresh Docker image built from the reorganized `src/` (`docker build .`) started, reported `/health` ok, and passed all 10 public cases (`scripts/test-samples.cjs`) against the real OpenAI key through the running container. The temporary image and container were removed after the check.

This confirms the reorganization did not change request/response behavior, guardrails, optimization results, or containerized startup.

## Completed checks

- TypeScript build succeeds.
- All 22 offline tests pass, including ten organizer reference cases, strict guardrails, HTTP/Swagger behavior, malformed requests, provider failures, cache behavior and independent replay.
- The solver matches an independent dynamic-programming optimum in 100 generated integral scenarios.
- Real OpenAI through a local NestJS HTTP server: **14/14 cases pass**, including all ten public cases and four additional paraphrases.
- All public-case optimized costs match the organizer references within 0.01 BDT.
- Five concurrent repeated live requests pass; maximum measured response time was 18 ms with validated interpretation caching.
- Measured live case p95: **4076 ms**. These are 14 observations on this development machine, not a guarantee of hidden-judge or deployed performance.
- Docker service passed all ten public cases with the real OpenAI key. The final Linux AMD64 image also passed all ten public cases with the real key.
- Production dependency audit reported zero known vulnerabilities at verification time.
- Repository file scan found no copy of the configured key outside the excluded environment file.
- Video: H.264 + AAC, 1280×720, **172.643 seconds**, below the 180-second limit. All six slides were visually inspected; audio stream decoded without errors and has nonzero signal.

## Live results

| Case | Optimal cost (BDT) | Latency (ms) | Result |
|---|---:|---:|---|
| SAMPLE-01 | 38365 | 2458 | passed |
| SAMPLE-02 | 42885 | 1947 | passed |
| SAMPLE-03 | 35480 | 3432 | passed |
| SAMPLE-04 | 40495 | 2319 | passed |
| SAMPLE-05 | 33950 | 1773 | passed |
| SAMPLE-06 | 34090 | 3064 | passed |
| SAMPLE-07 | 38550 | 2655 | passed |
| SAMPLE-08 | 37665 | 2763 | passed |
| SAMPLE-09 | 34873 | 2768 | passed |
| SAMPLE-10 | 41620 | 3612 | passed |
| SAMPLE-01-PARAPHRASE | 38365 | 4076 | passed |
| SAMPLE-03-PARAPHRASE | 35480 | 3080 | passed |
| SAMPLE-05-PARAPHRASE | 33950 | 2457 | passed |
| SAMPLE-08-PARAPHRASE | 37665 | 3009 | passed |

## Interpretation correction discovered during testing

The first live run passed all ten public cases but included the end hour in one extra military-time paraphrase. The general time conversion instructions were strengthened to enumerate `start <= h < end` for all range wording, and sampling temperature was set to zero for the configured GPT-4.1 model. The subsequent full 14-case run passed. This is measured evidence, not proof of correctness for every unseen natural-language note.

## Still external

A public-host deployment, a registry push/pull with an exact tag/digest, a GitHub repository with the required timing/visibility, and an organizer-accessible video upload still require the user's accounts. Local verification does not establish those deliverables. Follow `docs/deployment.md` and complete `docs/submission.md`.

## Final Docker packaging check

- Image: `gridwise:1.0.0`, Linux AMD64, built using Docker Buildx.
- Local image identifier: `sha256:529f46e2bd375d6a17a9713595e1dda9251e18592a02014957fbc4f165ff5789` (not a published registry reference).
- Runtime user: `node`, UID 1000. `/app/.env` is absent; the actual key is absent from image metadata and build history.
- Readiness after container launch: 6750 ms on this Apple Silicon machine under AMD64 emulation.
- All 10 real OpenAI public-case requests through the final container passed; latencies in case order were 6229, 1909, 3228, 2339, 2457, 2970, 3122, 2066, 5584, and 2828 ms. Container-run p95 was 6229 ms, in the guide's 5–15-second band. This differs from the native local run's 4076 ms p95; deployment latency must be measured separately.
- Temporary verification containers were removed after testing. The host NestJS service remains available on port 3000 for local use.
- The development watcher also reached readiness and shut down cleanly in a separate smoke check.
