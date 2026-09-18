# Verification evidence

**Primary, current evidence:** [the judge audit](judge-audit.md) — a dated, point-in-time report covering source, tests, and deployments end to end. This file adds deployment-specific detail the audit doesn't spell out, and keeps a short history of how the deployment target changed.

## Live deployment verification — bup.onukrom.xyz (current, primary)

DianaHost cPanel hosting (Node.js 20.20.2, Passenger); see [the deployment guide](dianahost.md) for how this was set up and how to redeploy.

- `BASE_URL=https://bup.onukrom.xyz npm run test:judge` on 2026-09-18: **46/46 checks passed** (10 public cases, 18 hand-authored language/energy edge cases, structural/guardrail validation, an engineered infeasible scenario, concurrency, and a post-error health check). Optimization p95 **5156 ms**; all requests well inside the 30-second budget.
- `GET /docs-json` matches the checked-in `docs/openapi.json` byte-for-byte.
- Response headers reviewed: no stack traces, no credentials; only expected `cloudflare`/`Express`/hosting platform headers.
- Not yet covered externally: a check from a genuinely separate network/device (all checks above ran from the development machine), and a deliberate idle/cold-start timing cycle (see the note in `docs/submission.md` about Passenger's idle-recycling behavior on shared hosting).

## DianaHost Node.js 20.20.2 package verification

The separate `deploy/dianahost` dependency profile and `scripts/package-dianahost.cjs` produced `artifacts/gridwise-dianahost-node20.zip`, which is what's actually uploaded to the live service above.

- Clean engine-strict install, TypeScript compilation, and all **44 offline tests passed** on exact Node.js **20.20.2**.
- Real OpenAI judge audit against this compatibility build: **46/46 checks passed**, measured optimization p95 **4693 ms**.
- Production dependency audit reported **zero known vulnerabilities** after the scoped Multer 2.4.0 override.
- Extracted the resulting ZIP into a separate directory, installed only production dependencies with engine-strict validation, and launched its `app.js`. Health and Swagger passed; readiness was **669 ms**, and real SAMPLE-01 returned the correct **38365 BDT** optimum in **2450 ms**.
- Archive contains no `.env`, no `node_modules`, and no occurrence of the configured OpenAI key in its 93 files.
- ZIP SHA256: `556a3fc89e4f3dbc73c5df437ae6b85126c5e429924474640697d4d4791b90bc`.

Node.js 20 is end-of-life upstream; this compatibility package does not extend its support, it only lets the app run on a host that doesn't yet offer a newer runtime.

## Docker Hub registry verification (reproducibility fallback)

- Built `onukrom/gridwise:1.0.0` for `linux/amd64` and pushed it to Docker Hub (public repository).
- Removed the local image, then pulled it back fresh with `docker pull --platform linux/amd64 onukrom/gridwise:1.0.0` — a plain `docker pull` (no `--platform`) fails on an arm64 dev machine with "no matching manifest," since only an amd64 image was published; documented in `docs/deployment.md` and `README.md`.
- Recorded digest: `sha256:10ca66bc808fc81a2e204cd0927b5740a23043bdb81b65420f7728cd81d7b6b3`.
- Ran the pulled image as a container with the real OpenAI key; `/health` returned `200 {"status":"ok"}`, and `npm run test:samples` against the running container passed all 10 public cases.
- Inspected the image filesystem and `docker history --no-trunc`: no `.env` file and no key/secret-like strings present anywhere in the image or its build history.

## Render deployment verification (historical, kept as a reproducibility backup)

`https://buphack.onrender.com` was the live service before the move to DianaHost. It remains a fully reproducible, independently verified alternative — steps kept in `docs/deployment.md` — but is **not** the submitted endpoint.

- Deployed as a Docker web service (free plan), health-check path `/health`, environment variables matching `.env.example`.
- 46/46 judge-audit checks passed against it, and separately 10/10 public samples, structural/guardrail edge cases, an engineered infeasible case, and 8 concurrent requests all returned correct, sanitized responses.
- Known risk if reproduced on the free plan: Render spins down after inactivity, which can push a cold-start request past PG §8's 60-second readiness budget. Use a paid plan or another always-on host if you rely on this path for judging.

## Source reorganization verification (historical)

The original flat `src/*.ts` layout was reorganized into the current NestJS module/controller/service tree (`energy`, `interpretation`, `health`, `config`, `common` modules; see `docs/architecture.md` and `src/README.md`). A clean `rm -rf dist && npm run build`, the full offline test suite, a fresh Docker build, and a real-OpenAI live run were all repeated against the reorganized source and passed, confirming the reorganization changed no request/response behavior, guardrails, or optimization results — it was a pure structural refactor. Along the way, a stale-`dist`-artifact bug that had let the pre-refactor test files silently pass locally (while failing on a truly clean CI checkout) was found and fixed; the current `test/` suite genuinely exercises the modular code.

## Interpretation correction discovered during testing

An early live run passed all ten public cases but included the end hour in one extra military-time paraphrase. The general time-conversion instructions were strengthened to enumerate `start <= h < end` for all range wording, and sampling temperature was set to zero for the configured GPT-4.1 model. The subsequent full run passed. This is measured evidence for the tested paraphrases, not proof of correctness for every unseen natural-language note.

## Still external

Continuous availability throughout judging, a genuine second-network/device reachability check, repository creation timing relative to the organizers' question reveal, post-deadline public visibility, organizer submission itself, and the video upload/access link remain outside what local or single-machine verification can establish. See `docs/submission.md` for the current state of each.
