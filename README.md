# GridWise — BUP CSE Fest 2026

A NestJS HTTP service that uses OpenAI to interpret campus operator notes, validates the interpretations, solves a continuous linear program for the cheapest valid 24-hour energy schedule, and independently replays the result before returning it.

**Judge endpoints:** `GET /health` and `POST /optimize-energy`. **Swagger:** `/docs`. **OpenAPI JSON:** `/docs-json` or [docs/openapi.json](docs/openapi.json). No login or API key header is required by callers. The OpenAI credential stays on the server.

## Local quickstart

Requires Node.js 22 or later (Node.js 24 tested), npm, internet access, and an OpenAI API key with model access and sufficient quota. No database, Python, native solver, training, or GPU is needed to run the service.

From a fresh clone, replace `YOUR_ACCOUNT` with the repository owner's GitHub name:

```bash
git clone https://github.com/YOUR_ACCOUNT/gridwise.git
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

| Variable | Default | Meaning |
|---|---|---|
| `OPENAI_API_KEY` | empty | Required server-side credential. Fill `.env` locally or the host's secret environment settings. |
| `OPENAI_MODEL` | `gpt-4.1-mini-2025-04-14` | OpenAI model snapshot supporting Responses structured output. Account access must be verified. |
| `PORT` | `3000` | Listening port, bound to `0.0.0.0`. |
| `OPENAI_TIMEOUT_MS` | `11000` | Deadline for each provider attempt. |
| `OPENAI_MAX_ATTEMPTS` | `2` | One or two attempts; SDK retries are disabled. |
| `CACHE_MAX_ENTRIES` | `256` | Maximum validated interpretation entries; `0` disables caching. |
| `CACHE_TTL_SECONDS` | `300` | Interpretation cache lifetime; `0` disables caching. |
| `BASE_URL` | `http://localhost:3000` | Used only by the external public-sample test script. |

The provider timeout multiplied by attempts must be at most 25 seconds, leaving room within the 30-second judge limit. Model latency and quota remain external dependencies. No key belongs in a Swagger request, URL, repository, Docker build argument, video, or submission field.

## Architecture and exact behavior

```text
JSON → request validation → OpenAI structured note interpretation
     → deterministic directive guardrails → linear-program optimizer
     → independent 24-hour replay → JSON response
```

The LLM is directly responsible for semantic interpretation of every note. It is not a cosmetic summary generator. No sample phrases, scenario IDs, or reference schedules are embedded in production code. The summary is generated deterministically from the computed plan.

1. Validate 24 unique hours, 1–3 nonblank notes, strict field types, finite nonnegative numeric values, and battery consistency. Unsorted request hours are accepted and sorted by hour. Extra fields and numeric strings are rejected.
2. OpenAI Responses with strict structured output produces one interpretation per note. Percentages, fractions, natural-language times, and distractors are explained in the prompt. An 80% reduction leaves `factor=0.2`; a half-capacity reserve uses the supplied capacity. The model cannot change demand, tariffs, or battery parameters.
3. Zod and deterministic cross-checks validate exact object shapes, supported types, `applies` semantics, one ordered mapping per note, unique ascending hours 0–23, factor in [0,1], finite nonnegative grid caps, and reserves no greater than capacity. Invalid interpretations are retried within the time budget and then fail safely. They are never silently replaced with `no_op`.
4. Apply all relevant directives and solve the 24-hour LP using `javascript-lp-solver`'s simplex solver. The objective is exactly the sum of grid import multiplied by tariff. No invented peak penalty or battery degradation cost changes the objective.
5. Replay the actual response against the original inputs and each directive, checking solar use, energy balance, battery transitions, bounds, rates, restricted windows, caps, neutrality, schema, and recalculated totals. A failed replay returns a controlled error.

| Directive | Exact adjustment | Scheduling effect |
|---|---|---|
| `solar_reduction` | `{hours, factor}` | Available solar = original forecast × remaining fraction. |
| `minimum_battery_reserve` | `{hours, minimum_energy_kwh}` | End-of-hour energy ≥ maximum of base and active reserves. |
| `no_charge_window` | `{hours}` | Battery energy cannot increase in those hours. |
| `no_discharge_window` | `{hours}` | Battery energy cannot decrease in those hours. |
| `max_grid_window` | `{hours, max_grid_kwh}` | Grid import cannot exceed the cap in any listed hour. |
| `no_op` | `null` | No constraint added; `applies=false`. |

Every other directive has `applies=true`. Time windows include the starting hour and exclude the ending hour. Unused solar is curtailed, grid export is prohibited, and terminal stored energy equals the initial energy. The model uses the specification's lossless battery behavior. See [the mathematical formulation](docs/architecture.md).

## Testing

```bash
# Offline: reference cases, guardrails, HTTP contract, failures, and an independent oracle
npm test

# Real OpenAI + local NestJS HTTP + optimizer + ground-truth replay
npm run test:live

# Against an already running local server
npm run test:samples

# Against the deployed public endpoint, preferably from a second network
BASE_URL=https://YOUR-SERVICE.example npm run test:samples

# Regenerate the checked-in API documentation
npm run export:openapi
```

Offline HTTP tests inject known interpretations strictly inside the test harness. They do **not** prove language understanding. Live tests run all ten public cases plus four newly phrased equivalents and five concurrent repeated requests, compare all machine-checkable interpretation fields, replay using the organizer's ground truth, and require optimal cost within 0.01 BDT. The 100 generated solver cases are separately checked by a dynamic-programming oracle. Free-text explanations and tied optimal action sequences are not compared byte-for-byte.

Live reports are written to ignored `artifacts/live-test-report.json` or `artifacts/key-check.json`. They record model, timestamp, results and measured p95. Live tests spend API credits. Failed checks exit nonzero. Public examples do not establish hidden-case accuracy.

See [recorded verification results](docs/verification.md) for the completed local checks and measured timings. Use `npm run start:dev` for a compiler/server watcher during further development.

## Docker fallback

Docker must be running. The build context permits only source/configuration files and excludes `.env` and all other files by default. The image runs as the non-root `node` user and includes a health check.

```bash
docker build -t gridwise:1.0.0 .
docker run --rm --name gridwise -p 3000:3000 --env-file .env -e PORT=3000 gridwise:1.0.0
```

Or run `docker compose up --build -d`. Then use the same health and sample test commands above. Do not run both the host service and Docker on port 3000 simultaneously.

After publishing an image, replace `YOUR_DOCKERHUB_ACCOUNT` with its actual account name:

```bash
docker pull YOUR_DOCKERHUB_ACCOUNT/gridwise:1.0.0
docker run --rm -p 3000:3000 --env-file .env -e PORT=3000 \
  YOUR_DOCKERHUB_ACCOUNT/gridwise:1.0.0
```

Submit the exact registry tag **and preferably immutable digest** after actually pushing and testing it. The placeholder above is not a published image. See [account creation, hosting, registry publishing, and submission steps](docs/deployment.md).

## Reliability and limitations

- Only validated LLM interpretations are cached, keyed by model, prompt version, all notes, battery data, and hourly inputs. New notes still go through the language model. Cache entries expire and are bounded; concurrent identical requests share one in-flight extraction. There is no disk cache, offline fake interpreter, or fallback to a fabricated schedule.
- Malformed requests return 400; inconsistent battery bounds or infeasible constraints return 422. Model/authentication/quota failures return sanitized 500 error codes. Responses and application logs do not contain raw provider errors, stack traces, notes, or secrets.
- `/health` reports configuration readiness, not proof of current account quota. Run the live tests before submission and keep the credential, quota, and model available throughout judging.
- The statement does not specify conflicting overlapping solar reductions. This implementation treats each as a cap relative to the original forecast and uses the strictest remaining fraction. Other overlapping limits are intersected. The statement guarantees feasible, noncontradictory judge scenarios. Cross-midnight ranges include the two daily portions in ascending order. These conventions are disclosed rather than claimed as published organizer rules.
- Floating-point replay uses 0.00001 internal tolerance and public-reference tests use at most 0.01. Very large values can exceed practical floating-point accuracy; such results fail replay instead of returning an invalid plan. The HTTP adapter's default body limit applies.
- The hosted LLM may misunderstand an unseen note while still returning structurally valid output. Deterministic validation cannot prove natural-language correctness; live paraphrase tests measure it. Remote latency can exceed the five-second full-score target. A public deployment and a registry image require your accounts.

## Required submission artifacts

The complete source is here. The [requirements checklist](docs/requirements.md) maps both PDFs to code/tests. The [submission checklist](docs/submission.md) distinguishes local artifacts from external actions still to complete. A narrated MP4 and its source/script are prepared under `deliverables/`; upload the final video or provide a judge-accessible link, and verify it is under three minutes.

Create the GitHub repository after question reveal, keep it private during the event, and make it public only after the submission deadline. Keep the public API, fallback image, repository and video accessible for evaluation. The provided guide's round window is 7–11 PM; it does not establish the actual event date. Follow the organizers' announced timing. Do not submit credentials in public fields.

## Dependencies and credits

NestJS provides the server and Swagger integration; OpenAI's official JavaScript SDK and Responses API provide language interpretation; Zod validates schemas; `javascript-lp-solver` provides the simplex implementation; dotenv loads local environment configuration; TypeScript, Node.js and npm build/run/test the application. Direct and transitive versions are locked in `package-lock.json`. RxJS and reflect-metadata support NestJS. Docker provides packaging. Test inputs and reference results are supplied by BUP CSE Fest 2026. OpenAI Codex assisted with implementation and verification; the team should review, understand, and be able to explain the code, in accordance with the guide's ownership requirement.

Implementation references: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [model documentation](https://developers.openai.com/api/docs/models/gpt-4.1-mini), [NestJS OpenAPI](https://docs.nestjs.com/openapi/introduction), [solver documentation](https://github.com/JWally/jsLPSolver). Video generation additionally uses local Pillow, macOS speech synthesis and FFmpeg; these are not API runtime dependencies.
