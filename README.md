# GridWise — BUP CSE Fest 2026

A NestJS HTTP service that uses OpenAI to interpret campus operator notes, validates the interpretations, solves a continuous linear program for the cheapest valid 24-hour energy schedule, and independently replays the result before returning it.

**Judge endpoints:** `GET /health` and `POST /optimize-energy`. **Swagger:** `/docs`. **OpenAPI JSON:** `/docs-json` or [docs/openapi.json](docs/openapi.json). No login or API key header is required by callers. The OpenAI credential stays on the server.

**Public service (current, live):** [https://bup.onukrom.xyz](https://bup.onukrom.xyz), deployed on DianaHost cPanel hosting (Node.js 20.20.2, Passenger). **Source:** [muin99/BoomBoom](https://github.com/muin99/BoomBoom). See [the source reading guide](src/README.md) for the module/controller/service layout.

## Local quickstart

Requires Node.js 22 or later (Node.js 24 tested), npm, internet access, and an OpenAI API key with model access and sufficient quota. No database, Python, native solver, training, or GPU is needed to run the service.

From a fresh clone (repository access is required while it remains private during the event):

```bash
git clone https://github.com/muin99/BoomBoom.git gridwise
cd gridwise
npm ci
cp .env.example .env
```

Edit `.env` and set `OPENAI_API_KEY`. If this workspace already has `.env`, preserve it instead of copying over it. Then:

```bash
npm run build
npm run check:key
npm start
```

`check:key` makes a real, billable OpenAI request through a temporary local NestJS HTTP server, verifies the interpretation of the first public sample, and replays its optimal schedule. It does not print the key. `npm start` listens on `0.0.0.0:3000` by default. Restart after editing `.env`.

In another terminal:

```bash
curl --fail-with-body http://localhost:3000/health
curl --fail-with-body http://localhost:3000/optimize-energy \
  -H 'Content-Type: application/json' \
  --data-binary @examples/request.json
```

Health returns `{"status":"ok"}` when the server has its required configuration. Health does not spend tokens or check remote quota; `check:key` verifies real provider access. A missing key returns a controlled HTTP 500 readiness error. Open [http://localhost:3000/docs](http://localhost:3000/docs) for interactive API documentation and full request/response schemas.

The example is public SAMPLE-01. Expected cost is **38365 BDT** and total grid import **2692.5 kWh**. The [reference response](examples/reference-response.json) is the organizer's example. Equivalent optimal schedules can differ in hourly actions. All mandatory output fields and exact directive shapes are returned.

## Configuration

| Variable              | Default                   | Meaning                                                                                                   |
| --------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `OPENAI_API_KEY`      | empty                     | Required server-side credential. Fill`.env` locally or the host's secret environment settings.            |
| `OPENAI_MODEL`        | `gpt-4.1-mini-2025-04-14` | OpenAI model snapshot supporting Responses structured output. Account access must be verified.            |
| `PORT`                | `3000`                    | Listening port, bound to`0.0.0.0`.                                                                        |
| `OPENAI_TIMEOUT_MS`   | `11000`                   | Deadline for each provider attempt.                                                                       |
| `OPENAI_MAX_ATTEMPTS` | `2`                       | One or two attempts; SDK retries are disabled.                                                            |
| `CACHE_MAX_ENTRIES`   | `256`                     | Maximum validated interpretation entries;`0` disables caching.                                            |
| `CACHE_TTL_SECONDS`   | `300`                     | Interpretation cache lifetime;`0` disables caching.                                                       |
| `BASE_URL`            | `http://localhost:3000`   | Target URL for public-sample and judge-audit scripts; the judge audit starts a local server when omitted. |

The provider timeout multiplied by attempts must be at most 25 seconds, leaving room within the 30-second judge limit. Model latency and quota remain external dependencies. No key belongs in a Swagger request, URL, repository, Docker build argument, or submission field.

## Architecture and exact behavior

```text
JSON → request validation → OpenAI structured note interpretation
     → deterministic directive guardrails → linear-program optimizer
     → independent 24-hour replay → JSON response
```

The source is a standard NestJS module/controller/service layout, one feature per module:

| Layer              | Source                                                                                                                                                                                                                                   | Responsibility                                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap          | `src/main.ts`, `src/bootstrap.ts`, `src/app.module.ts`                                                                                                                                                                                   | Process entry point, Nest app assembly, global pipes/filters/Swagger wiring                                                     |
| Configuration      | `src/config/environment.ts`, `src/config/configuration.module.ts`, `.env.example`                                                                                                                                                        | Env parsing and a global`APP_CONFIG` provider for credential, model, port and time budget                                       |
| Shared/common      | `src/common/validation/value.schemas.ts`, `src/common/swagger/*`, `src/common/filters/safe-exception.filter.ts`                                                                                                                          | Shared Zod primitives, OpenAPI schema generation from those same schemas, sanitized error responses                             |
| Energy controller  | `src/energy/energy.controller.ts`, `src/energy/pipes/optimize-energy-request.pipe.ts`                                                                                                                                                    | `POST /optimize-energy` route and Zod-backed request validation pipe                                                            |
| Energy models/DTOs | `src/energy/models/scenario.model.ts`, `plan.model.ts`, `src/energy/dto/optimize-energy-request.dto.ts`, `optimize-energy-response.dto.ts`                                                                                               | Request/output schemas and cross-field guardrails                                                                               |
| Energy services    | `src/energy/services/energy.service.ts`, `energy-optimizer.service.ts`, `plan-replay.service.ts`, `src/energy/optimization/energy-lp.model.ts`                                                                                           | Orchestration (interpret → validate → optimize → replay), LP construction/solve, independent replay verification                |
| Interpretation     | `src/interpretation/services/openai-interpreter.service.ts`, `directive-validator.service.ts`, `interpretation-cache.service.ts`, `providers/openai-client.provider.ts`, `prompts/operator-notes.prompt.ts`, `models/directive.model.ts` | Real OpenAI Responses extraction behind a`NoteInterpreter` interface, deadlines, retries, validated cache, directive guardrails |
| Health             | `src/health/health.controller.ts`, `health.service.ts`                                                                                                                                                                                   | `GET /health` readiness check that exercises the same interpreter dependency                                                    |

The energy and health services depend only on the `NOTE_INTERPRETER` interface (`src/interpretation/interfaces/note-interpreter.interface.ts`), not on the OpenAI SDK directly, so the interpretation module can be swapped or mocked without touching scheduling code. See [the source reading guide](src/README.md) for a recommended file-by-file reading order.

The LLM is directly responsible for semantic interpretation of every note. It is not a cosmetic summary generator. No sample phrases, scenario IDs, or reference schedules are embedded in production code. The summary is generated deterministically from the computed plan.

1. Validate 24 unique hours, 1–3 nonblank notes, strict field types, finite nonnegative numeric values, and battery consistency. Unsorted request hours are accepted and sorted by hour. Extra fields and numeric strings are rejected.
2. OpenAI Responses with strict structured output produces one interpretation per note. Percentages, fractions, natural-language times, and distractors are explained in the prompt. An 80% reduction leaves `factor=0.2`; a half-capacity reserve uses the supplied capacity. The model cannot change demand, tariffs, or battery parameters.
3. Zod and deterministic cross-checks validate exact object shapes, supported types, `applies` semantics, one ordered mapping per note, unique ascending hours 0–23, factor in [0,1], finite nonnegative grid caps, and reserves no greater than capacity. Invalid interpretations are retried within the time budget and then fail safely. They are never silently replaced with `no_op`.
4. Apply all relevant directives and solve the 24-hour LP using `javascript-lp-solver`'s simplex solver. The objective is exactly the sum of grid import multiplied by tariff. No invented peak penalty or battery degradation cost changes the objective.
5. Replay the actual response against the original inputs and each directive, checking solar use, energy balance, battery transitions, bounds, rates, restricted windows, caps, neutrality, schema, and recalculated totals. A failed replay returns a controlled error.

| Directive                 | Exact adjustment              | Scheduling effect                                         |
| ------------------------- | ----------------------------- | --------------------------------------------------------- |
| `solar_reduction`         | `{hours, factor}`             | Available solar = original forecast × remaining fraction. |
| `minimum_battery_reserve` | `{hours, minimum_energy_kwh}` | End-of-hour energy ≥ maximum of base and active reserves. |
| `no_charge_window`        | `{hours}`                     | Battery energy cannot increase in those hours.            |
| `no_discharge_window`     | `{hours}`                     | Battery energy cannot decrease in those hours.            |
| `max_grid_window`         | `{hours, max_grid_kwh}`       | Grid import cannot exceed the cap in any listed hour.     |
| `no_op`                   | `null`                        | No constraint added;`applies=false`.                      |

Every other directive has `applies=true`. Time windows include the starting hour and exclude the ending hour. Unused solar is curtailed, grid export is prohibited, and terminal stored energy equals the initial energy. The model uses the specification's lossless battery behavior.

### Mathematical formulation

For hour h, the variables are grid energy G[h], solar actually used S[h], and stored energy after the hour E[h]. All are nonnegative continuous variables. E[-1] is the given initial battery energy.

```text
minimize  Σ tariff[h] × G[h]

G[h] + S[h] - E[h] + E[h-1] = demand[h]
0 ≤ S[h] ≤ effective_solar[h]
0 ≤ G[h] ≤ active_grid_cap[h]
active_reserve[h] ≤ E[h] ≤ capacity
-allowed_discharge[h] ≤ E[h] - E[h-1] ≤ allowed_charge[h]
E[23] = initial_energy
```

There are 72 variables. A finite default grid upper bound of demand plus maximum charging is implied by energy balance and nonnegative solar, so it excludes no valid schedule. No-charge/no-discharge directives set the corresponding allowed rate to zero. A reserve acts after the listed hour, precisely as specified. All hours are jointly optimized, so early charging can prepare for a later cap or reserve.

Let delta = E[h] − E[h−1]. Positive delta becomes `charge` with magnitude delta; negative delta becomes `discharge` with magnitude −delta; zero becomes `idle` with magnitude zero. A single signed difference rules out simultaneous charging and discharging without integer variables or a heuristic. Substitution into the balance equation gives exactly the specified hourly accounting. Every valid schedule can be represented by these variables, and every feasible solution maps back to a valid schedule. Thus solving this LP minimizes the required objective over the entire continuous feasible schedule set, subject to numerical precision.

The solver uses precision 1e-9. Only near-zero noise is cleaned and hourly numbers are retained to nine decimal places. Totals are recomputed from the actual returned grid values and original tariffs. The replay reads each directive independently instead of trusting the optimizer's derived bounds; a failed replay prevents HTTP 200. An independent dynamic-programming oracle (test-only, never in the production path) enumerates stored-energy states across hundreds of generated scenarios to confirm the LP finds the true optimum — see `test/helpers/dp-oracle.cjs`.

The LLM request places notes in the user-data message, keeps the extraction rules in higher-priority instructions, uses strict structured outputs, disables stored Responses, and never includes the API key in message content. Runtime validation still treats every model response as untrusted. No deterministic phrase-matching interpreter or fabricated success path exists.

## Testing

```bash
# Offline: reference cases, guardrails, HTTP contract, failures, and an independent oracle
npm test

# Real OpenAI + local NestJS HTTP + optimizer + ground-truth replay
npm run test:live

# Against an already running local server
npm run test:samples

# Against the deployed public endpoint, preferably from a second network
BASE_URL=https://bup.onukrom.xyz npm run test:samples

# Judge-style checks: 10 public cases, 18 new edge cases, HTTP errors and concurrency
npm run test:judge
BASE_URL=https://bup.onukrom.xyz npm run test:judge

# Regenerate the checked-in API documentation
npm run export:openapi
```

Offline HTTP tests inject known interpretations strictly inside the test harness. They do **not** prove language understanding. Live tests run all ten public cases plus four newly phrased equivalents and five concurrent repeated requests, compare all machine-checkable interpretation fields, replay using the organizer's ground truth, and require optimal cost within 0.01 BDT. Independent dynamic-programming oracles check 100 original generated cases plus 500 new fractional scenarios with directive combinations, including feasible and infeasible inputs. The judge audit adds 18 hand-authored language/energy edge cases and compares their costs with the independent oracle. Free-text explanations and tied optimal action sequences are not compared byte-for-byte.

Live reports are written to ignored `artifacts/live-test-report.json` or `artifacts/key-check.json`. They record model, timestamp, results and measured p95. Live tests spend API credits. Failed checks exit nonzero. Public examples do not establish hidden-case accuracy. Use `npm run start:dev` for a compiler/server watcher during further development.

## Docker fallback

Docker must be running. The build context permits only source/configuration files and excludes `.env` and all other files by default. The image runs as the non-root `node` user and includes a health check.

```bash
docker build -t gridwise:1.0.0 .
docker run --rm --name gridwise -p 3000:3000 --env-file .env -e PORT=3000 gridwise:1.0.0
```

Or run `docker compose up --build -d`. Then use the same health and sample test commands above. Do not run both the host service and Docker on port 3000 simultaneously.

The published fallback is `onukrom/gridwise:1.0.0`. Pull and run the recorded immutable digest:

```bash
docker pull --platform linux/amd64 onukrom/gridwise@sha256:10ca66bc808fc81a2e204cd0927b5740a23043bdb81b65420f7728cd81d7b6b3
docker run --rm --platform linux/amd64 -p 3000:3000 --env-file .env -e PORT=3000 \
  onukrom/gridwise@sha256:10ca66bc808fc81a2e204cd0927b5740a23043bdb81b65420f7728cd81d7b6b3
```

On an arm64 host (e.g. Apple Silicon), `--platform linux/amd64` is required on both commands — a plain `docker pull` there fails with "no matching manifest" since only an amd64 image is published. Typical judge servers are amd64 already and don't need the flag.

This digest has been pulled and tested. A later source change does not update this immutable image; publish a new version when releasing changes and record its new digest here.

## Reproducing the deployment elsewhere

This codebase isn't tied to one host. Three verified paths:

**Docker, any host** — see [Docker fallback](#docker-fallback) above.

**Render** (previously the live service, kept as a verified reproducibility path — not the current one): create a [Render](https://render.com/) account, **New → Web Service**, Docker runtime, Dockerfile path `./Dockerfile`, environment variables matching `.env.example`, health-check path `/health`. Render's free plan spins down after inactivity, which risks the judging guide's readiness/request budgets — use a paid plan or another always-on host if you rely on this path.

**DianaHost / other cPanel hosts on old Node.js** (the current live service runs this way): DianaHost's shared hosting offers Node.js 20.20.2 through cPanel's Node.js Selector, older than this repo's main `>=22` target, so a separate pinned-dependency profile lives in `deploy/dianahost/` (NestJS 11, Swagger 11, OpenAI SDK 6 — same application source, same LP solver, same prompt and model).

1. Rebuild the upload from the repository root: `npx --yes --package=node@20.20.2 -c 'node scripts/package-dianahost.cjs --live'`. This stages `deploy/dianahost/` plus current `src/`, builds and tests it on exact Node.js 20.20.2, runs the real OpenAI judge audit (`--live` only; omit it to skip that and save API credits), and produces `artifacts/gridwise-dianahost-node20.zip` with compiled `dist/` already inside — no server-side build needed.
2. In cPanel: create a subdomain, then **Software → Setup Node.js App → Create Application** with Node.js `20.20.2`, application mode `Production`, an application root outside `public_html`, and startup file `app.js`.
3. Upload and extract the ZIP directly into that application root (so `app.js`, `package.json`, and `dist/main.js` sit at the top level, not nested).
4. Add environment variables in the Node.js app panel: `NODE_ENV=production`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4.1-mini-2025-04-14`. Leave `PORT` unset — Passenger routes HTTPS to the app automatically.
5. Click **Run NPM Install**, then **Restart**. Visit `https://your-subdomain/health` to confirm, then run `BASE_URL=https://your-subdomain npm run test:judge` from your own machine.

If cPanel's install-check shows a content-type warning after "NPM Install," that's a known CloudLinux/Passenger false positive — it just means the app went from a static placeholder page to a real JSON response after restart. Judge that by actually hitting `/health` and `/optimize-energy`, not by that message alone.

## Reliability and limitations

- Only validated LLM interpretations are cached, keyed by model, prompt version, all notes, battery data, and hourly inputs. New notes still go through the language model. Cache entries expire and are bounded; concurrent identical requests share one in-flight extraction. There is no disk cache, offline fake interpreter, or fallback to a fabricated schedule.
- Malformed requests return 400; inconsistent battery bounds or infeasible constraints return 422. Model/authentication/quota failures return sanitized 500 error codes. Responses and application logs do not contain raw provider errors, stack traces, notes, or secrets.
- `/health` reports configuration readiness, not proof of current account quota. Run the live tests before submission and keep the credential, quota, and model available throughout judging.
- The statement does not specify conflicting overlapping solar reductions. This implementation treats each as a cap relative to the original forecast and uses the strictest remaining fraction. Other overlapping limits are intersected. The statement guarantees feasible, noncontradictory judge scenarios. Cross-midnight ranges include the two daily portions in ascending order. These conventions are disclosed rather than claimed as published organizer rules.
- Floating-point replay uses 0.00001 internal tolerance and public-reference tests use at most 0.01. Very large values can exceed practical floating-point accuracy; such results fail replay instead of returning an invalid plan. The HTTP adapter's default body limit applies.
- The hosted LLM may misunderstand an unseen note while still returning structurally valid output. Deterministic validation cannot prove natural-language correctness; live paraphrase tests measure it. Remote latency can exceed the five-second full-score target. The live service runs on shared cPanel hosting (Passenger); an idle application can be recycled and the first request after idle time may be slower than a warm one. Availability throughout judging must be monitored.
- Node.js 20 (used by the DianaHost compatibility profile) is end-of-life upstream; that profile lets the app run on a host that doesn't yet offer a newer runtime, it doesn't extend Node 20's own support window.

## Submission notes

Create the GitHub repository after question reveal, keep it private during the event, and make it public only after the submission deadline. Keep the public API, fallback image, and repository accessible for evaluation. The provided guide's round window is 7–11 PM; it does not establish the actual event date. Follow the organizers' announced timing. Do not submit credentials in public fields. No solution video is included with this submission; per the official rubric, the video affects only tie-breaks and carries no base-score points.
