# Requirement traceability

Both source PDFs were read in full, with their extracted text preserved in `docs/source/`. Line references below refer to those text files. The embedded processing-flow diagram on Problem Statement page 3 was also visually checked. The public JSON pack was read in full, including its metadata, all inputs, reference outputs and rationales. No hidden judge data is available.

Latest execution evidence: [judge audit](judge-audit.md), including 18 additional live edge cases and 500 generated fractional solver scenarios. Video is excluded from that audit.

PS = `docs/source/problem-statement.txt`; PG = `docs/source/participant-guide.txt`. External requirements are not marked complete merely because a configuration file exists.

| Source | Requirement | Implementation or evidence |
|---|---|---|
| PS 8–19, 55–62 | One synthetic 24-hour campus scenario, 1–3 operator notes, structured JSON | Strict request schema; synthetic reference/generator tests |
| PS 21–50, 476–485; PG §1, §3 | Canonical sources and precedence | PS used for behavior; PG for submission/scoring |
| PS 67–89; PG §4 | Generative LLM directly interprets notes | OpenAI Responses in `src/interpretation/services/openai-interpreter.service.ts`; real live HTTP tests |
| PS 70–77; PG §9 | LLM only in summaries or sole hardcoded matching is disallowed | No production reference import or phrase matcher; summary uses computed values |
| PS 94–114 | Exactly six supported directive types and adjustment shapes | Discriminated strict Zod union; Swagger schemas |
| PS 116–148 | Inclusive start, exclusive end; remaining solar fraction | Prompt and live/reference tests |
| PS 129–145 | One entry per note, correct order, applies/null semantics, unique sorted hours | `validateDirectives`; negative tests |
| PS 139–151 | Do not invent input values; feasible noncontradictory judge scenarios | Read-only scenario context, strict output, controlled infeasibility |
| PS 153–168 | Minimize tariff-weighted grid cost; apply all directives | LP objective and all five constraint transformations |
| PS 173–197 | Exact endpoints; health JSON; 200/400/optional 422/controlled 500 | NestJS controllers, filter and HTTP tests |
| PS 201–257 | Exact input fields, battery fields, 24 unique hours, 1–3 nonempty notes | `requestSchema`; strict validation tests |
| PS 262–302 | Guardrail every type, mapping, hour, scalar, reserve/cap, applies, shapes | Zod plus deterministic cross-field checks before optimization |
| PS 304–309 | Safe malformed/unsupported model-output failure | Bounded retry then sanitized error; tests for bad output/auth errors |
| PS 313–326 | Battery state, capacity/reserve, hourly charge/discharge limits | Signed stored-energy differences, bounds, rate constraints and replay |
| PS 328–341 | Effective solar, curtailment, no export, hourly balance, daily neutrality | LP constraints and independent replay |
| PS 354–404 | Seven top-level fields; five interpretation fields; six hourly fields | Strict response schema, Swagger and replay |
| PS 407–425 | Interpretation example fragment | Full actual responses always contain every note; fragment is not copied as full output |
| PS 428–462 | Ground-truth semantics/application, paraphrases, finite values, totals | Live comparisons use reference directives, not just self-reported ones |
| PS 465–472 | Equivalent optimal schedules; tolerance 0.01 | Compare validity/cost, not schedule bytes; tighter internal replay |
| PG §2 | Complete API, source and dependency/configuration files | NestJS source, package lock, TypeScript, Docker, examples, tests |
| PG §2 | Self-contained README including environment/model/solver/setup/test/limitations | `README.md` |
| PG §2 | Tested, pullable exact Docker tag/digest, port, bind, no baked secrets | `onukrom/gridwise:1.0.0` (`sha256:10ca66bc808fc81a2e204cd0927b5740a23043bdb81b65420f7728cd81d7b6b3`) pushed, pulled fresh, and container-tested with all 10 public cases; image scan found no baked secrets |
| PG §2 | ≤3-minute video showing problem, architecture, approach and run/tests | Narrated video and script in `deliverables/`, duration verified (172.6s); upload/access verification still needed |
| PG §2–3 | One public service exposing both endpoints without login/VPN | **Live** at `https://buphack.onrender.com`; `/health` and `/optimize-energy` verified externally with no caller auth, including Swagger at `/docs` |
| PG §3 | Endpoint continuously reachable; tests from outside development environment | `BASE_URL=https://buphack.onrender.com npm run test:samples` passed 10/10 externally, plus edge cases and concurrency; tested from this development machine only — a second network/device check is still recommended. Service is on Render's free plan, which spins down after inactivity; see cold-start risk in `docs/submission.md` |
| PG §3–4 | Provider available during evaluation; no training jobs | Hosted API, no training; user manages quota and billing |
| PG §4 | Deterministic processing allowed, solver libraries allowed | Zod guardrails and disclosed simplex solver |
| PG §4 | Never commit/expose secrets or sensitive stacks/prompts | Git ignore, Docker allowlist, sanitized filters/provider errors, key-redaction tests |
| PG §4 | Synthetic data only | Organizer samples and synthetic generated scenarios |
| PG §4 | New repository after reveal; private during event; public after deadline | Authenticated fresh clone of `https://github.com/muin99/BoomBoom` verified; unauthenticated access returns 404. Creation relative to reveal remains unverified; make public after the submission deadline |
| PG §4 | Credit tools; team owns/understands core design | README dependency/Codex credits and mathematical explanation; team review needed |
| PG §5 | API, interpretation, guardrails, energy, robustness, local reproducibility checks | Offline HTTP tests, live runner, reference examples and Docker smoke tests |
| PG §5 | No secrets in public submission fields | Submission template contains no credentials |
| PG §6–7 | 100 points: 25 interpretation, 25 correctness, 10 optimization, 10 API, 10 performance, 10 deployment, 10 docs | Test coverage and deliverables match categories; no claim to hidden judge score |
| PG §6–7 | Validity before cost; video is tie-break only | Ground-truth replay precedes cost check; required video remains deliverable |
| PG §7 | Cost score ratio and zero-cost edge case | Exact LP minimum, zero tariff/surplus tests; official scoring not reproduced as hidden judge |
| PG §8 | Health ready within 60s; requests under 30s | Startup and live timing checks; bounded 25s provider budget |
| PG §8 | p95 bands ≤5s, ≤15s, ≤30s; failure-rate stability | Fresh local live report records case timings; public judge-audit timings may include cache hits; repeat/concurrency checks |
| PG §8 | Safe malformed input, provider failures, secret handling | Controlled 400/422/500, retry/caching tests |
| PG §9 | Invalid/ignored directives, balance/bounds/neutrality/totals lose correctness | Independent final replay blocks invalid successful responses |
| PG §10 | Hidden paraphrases/numeric variation, no public hardcoding | Live paraphrases, random DP oracle, no production fixture import |
| PG §10 | Tie-break sequence starts with video then technical subscores | Video plus architecture/correctness evidence prepared |
| PG §11 | Final checklist including external URL, repo/image/video availability | `docs/submission.md`; public URL, private repo and Docker Hub image now live and verified, video upload still pending |

The PG optimization-score paragraph ends mid-sentence in the provided PDF after “quality_ratio”; it is not a reason to invent an additional API rule. The optimization objective and zero-cost handling are clear from the canonical problem and the preceding guide text.
