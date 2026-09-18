# Architecture and correctness argument

The production API never loads the public sample pack. Tests alone read reference interpretations and schedules.

The source is a standard NestJS module/controller/service layout, one feature per module:

| Layer | Source | Responsibility |
|---|---|---|
| Bootstrap | `src/main.ts`, `src/bootstrap.ts`, `src/app.module.ts` | Process entry point, Nest app assembly, global pipes/filters/Swagger wiring |
| Configuration | `src/config/environment.ts`, `src/config/configuration.module.ts`, `.env.example` | Env parsing and a global `APP_CONFIG` provider for credential, model, port and time budget |
| Shared/common | `src/common/validation/value.schemas.ts`, `src/common/swagger/*`, `src/common/filters/safe-exception.filter.ts` | Shared Zod primitives, OpenAPI schema generation from those same schemas, sanitized error responses |
| Energy controller | `src/energy/energy.controller.ts`, `src/energy/pipes/optimize-energy-request.pipe.ts` | `POST /optimize-energy` route and Zod-backed request validation pipe |
| Energy models/DTOs | `src/energy/models/scenario.model.ts`, `plan.model.ts`, `src/energy/dto/optimize-energy-request.dto.ts`, `optimize-energy-response.dto.ts` | Request/output schemas and cross-field guardrails |
| Energy services | `src/energy/services/energy.service.ts`, `energy-optimizer.service.ts`, `plan-replay.service.ts`, `src/energy/optimization/energy-lp.model.ts` | Orchestration (interpret → validate → optimize → replay), LP construction/solve, independent replay verification |
| Interpretation | `src/interpretation/services/openai-interpreter.service.ts`, `directive-validator.service.ts`, `interpretation-cache.service.ts`, `providers/openai-client.provider.ts`, `prompts/operator-notes.prompt.ts`, `models/directive.model.ts` | Real OpenAI Responses extraction behind a `NoteInterpreter` interface, deadlines, retries, validated cache, directive guardrails |
| Health | `src/health/health.controller.ts`, `health.service.ts` | `GET /health` readiness check that exercises the same interpreter dependency |

The energy and health services depend only on the `NOTE_INTERPRETER` interface (`src/interpretation/interfaces/note-interpreter.interface.ts`), not on the OpenAI SDK directly, so the interpretation module can be swapped or mocked without touching scheduling code.

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

The solver uses precision 1e-9. Only near-zero noise is cleaned and hourly numbers are retained to nine decimal places. Totals are recomputed from the actual returned grid values and original tariffs. The replay reads each directive independently instead of trusting the optimizer's derived bounds. It verifies the response schema as well as all hourly constraints, totals and neutrality; a failed replay prevents HTTP 200.

The independent test oracles enumerate stored-energy states for 100 original integral scenarios and 500 further scenarios on quarter/half/integer energy lattices, including directive combinations and infeasibility. This network-flow formulation has integral optimal vertices with integral capacities and demand, allowing exact oracle cost comparison without discretizing arbitrary production inputs. The ten organizer references exercise every directive and multiple combinations, with identical optimal costs required.

The LLM request places notes in the user-data message, keeps the extraction rules in higher-priority instructions, uses strict structured outputs, disables stored Responses, and never includes the API key in message content. Runtime validation still treats every model response as untrusted. No deterministic phrase-matching interpreter or fabricated success path exists.

For a file-by-file reading order, see [the source guide](../src/README.md). Module and test-provider design follows [NestJS modules](https://docs.nestjs.com/modules) and [NestJS testing](https://docs.nestjs.com/fundamentals/testing).
