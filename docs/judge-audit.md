# Judge audit — 2026-09-18

**Verdict:** no functional failure in the exercised public cases, added edge cases, or generated solver cases. The deployed API, GitHub source checkout, and published Docker fallback work. Final submission readiness still depends on hosting availability, repository timing/visibility, and organizer submission. Video was explicitly excluded from this audit. These results do not establish a hidden-judge score.

## Specification and approach

The original problem-statement PDF and participant-guide PDF in this directory were the reference, together with the original public sample JSON. Fresh PDF text extraction matched the checked-in `source/` text. [Requirement traceability](requirements.md) maps the requirements to implementation and evidence; the problem statement controls API/energy behavior and the guide controls submission and evaluation rules.

Production uses **continuous linear programming with simplex**, via `javascript-lp-solver`: 72 variables represent grid import, used solar, and end-of-hour stored energy across 24 hours. It minimizes exactly tariff-weighted grid cost. Battery state differences determine charge/discharge, with terminal energy equal to initial energy. Dynamic programming is an independent test oracle only; production does not discretize energy. See [the formulation](architecture.md) and [the source reading guide](../src/README.md).

Source is organized into NestJS feature modules, controllers, services, DTOs/models, validation pipes, a provider interface, and separate LP construction and replay. OpenAI directly interprets notes before deterministic validation and optimization. The server-side key is never required in caller requests.

## Executed checks

| Check | Result | Scope |
|---|---|---|
| Fresh clone of actual GitHub HEAD | 22/22 tests passed after `npm ci` | Commit `3fe7ef70321e3aad8b11e2ebf0b5830b714fb4da` |
| Clean copy of current working source | 44/44 tests passed after `npm ci` | No inherited `dist`, dependencies, or `.env` |
| Original organizer cases | 10/10 passed | Interpretation, ground-truth replay, and optimum within 0.01 BDT |
| Additional generated fractional cases | 500/500 passed | 418 feasible optima and 82 infeasible cases matched independent DP |
| Original generated cases | 100/100 passed | Independent integral DP oracle |
| Local real-OpenAI HTTP audit | 46/46 checks passed | 10 public + 18 added cases, Swagger, errors, concurrency, health |
| Public Render HTTP audit | 46/46 checks passed | Same checks against `https://buphack.onrender.com` |
| Separate local real-OpenAI suite | 14/14 cases passed | Public cases + 4 paraphrases; five concurrent repeats also passed |
| Published Docker image | Pulled successfully; 10/10 public cases passed | Actual registry image, real key supplied only at runtime |
| Final working-source Docker build | Build, readiness, and real SAMPLE-01 passed | Temporary local image; readiness 339 ms, sample 2568 ms |
| Numeric-scale smoke checks | 6/6 passed | Scales from `1e-6` through `1e9`; not a proof for arbitrary magnitudes |
| Formatting and production dependency audit | Passed; zero reported vulnerabilities | Point-in-time checks |

The 500 generated scenarios vary tariffs, demand, solar, battery bounds/rates, fractional energies, input-hour order, and 1–3 directives. The separate DP implementation imports no application code and uses a lattice compatible with these fixtures. A combined generated-case test counts as one of the 44 test entries, so these counts should not be added as independent suites.

Added language cases cover irrelevant future/administrative notes; midnight and all-day windows; zero/full/one-third solar factors; zero/fractional reserves; zero/decimal grid caps; overlapping restrictions; first/last-hour boundaries; a malicious instruction embedded alongside a valid directive; a zero-energy system; and full terminal reserve. Expected interpretation fields are hand-authored, and expected costs come from the independent oracle.

Malformed JSON, overflowing JSON numbers, duplicate/missing/out-of-range hours, blank/too many notes, numeric strings, negative values, extra fields, inconsistent battery bounds and infeasible schedules returned controlled errors. Offline reliability tests additionally exercised real SDK serialization/structured parsing using a simulated provider transport, authentication errors, rate limits, timeouts, malformed output, cache expiry/eviction, and concurrent request coalescing. Simulated provider failures are not live OpenAI outages.

## Timing and artifact evidence

Public optimization p95 was **3328 ms** over 28 successful case requests; local judge-audit p95 was **4919 ms**. The separate fresh local 14-case live suite measured **3861 ms**. All audited live case requests finished within 30 seconds. Public timings can include validated interpretation cache hits and do not prove uncached, cold-start, sustained-load, or hidden-judge performance. Eight concurrent public repeats succeeded.

- Public API: [Render service](https://buphack.onrender.com), [health](https://buphack.onrender.com/health), [Swagger](https://buphack.onrender.com/docs). Required endpoints accept callers without authentication. OpenAPI request/response schemas matched the checked-in contract.
- Source: [muin99/BoomBoom](https://github.com/muin99/BoomBoom). Authenticated clone and clean install/test succeeded. An unauthenticated request returned 404, consistent with private access; that response alone cannot prove account settings, creation timing, or file absence.
- Registry: `onukrom/gridwise:1.0.0`, immutable digest `sha256:10ca66bc808fc81a2e204cd0927b5740a23043bdb81b65420f7728cd81d7b6b3`. Published platform is `linux/amd64`; Apple Silicon requires `--platform linux/amd64`. Runtime UID is 1000. The pulled image contains no `/app/.env`, and its metadata/history contained no occurrence of the configured key.
- `.env` is untracked. A scan of 76 local historical Git blobs found no occurrence of the configured key. This is a bounded check for that key, not a guarantee that every possible credential in every artifact has been discovered.

Machine-readable reports remain in ignored local `artifacts/`: `judge-audit-local.json`, `judge-audit-public.json`, `live-test-report.json`, `numeric-scale-audit.json`, `git-secret-audit.json`, and `final-container-audit.json`. No secret values are included in this report.

## Remaining submission checks

1. **Hosting availability:** existing deployment documentation identifies Render's free plan. [Render documents](https://render.com/docs/free) spin-down after 15 idle minutes and a wake-up of about one minute. This risks the guide's readiness/request budgets. A deliberate cold-start test and availability throughout judging remain unverified; use hosting that stays active. No hosting plan was changed.
2. **Outside-development check:** public requests succeeded from the development machine over HTTPS. Run the documented endpoint tests from a second network/device to remove the remaining ambiguity against PG §3. An independent web-fetch tool could not retrieve the endpoint, so it is not counted as a successful second-network test.
3. **Repository rules and submission:** verify creation occurred after the actual question reveal, make the repository public after the submission deadline, ensure the team understands and credits the solution, and submit the recorded artifact references to the organizers. The supplied guide states the round hours but does not supply the event date needed to establish those timing facts.
4. **Publish the latest audit additions:** the verified remote commit has 22 tests; the working tree has 44 tests, the reusable judge runner, documentation corrections, and small source cleanup. These local changes have not been pushed or deployed by this audit. Publish source/image updates together if releasing them; the already-tested immutable Docker digest does not change when local files change.
5. **Provider availability:** real calls verified that credentials worked during these runs. Keep model access, quota, and service available throughout evaluation. `/health` checks configuration readiness, not current provider quota.

Overlapping solar reductions and cross-midnight interpretation conventions are disclosed in the README because the statement does not fully define those combinations. Unseen natural-language interpretations remain probabilistic even when structural validation passes. No claim is made that organizer hidden tests or every possible input have been exhausted.

## Reproduce

```bash
npm ci
npm test
npm run format:check
npm run test:live
npm run test:judge
BASE_URL=https://buphack.onrender.com npm run test:judge
```

Live commands use API credits. Use the exact Docker pull/run commands in the [README](../README.md) for registry fallback verification. The [submission checklist](submission.md) contains the actual endpoint, repository, and image references; they do not need to be created again.
