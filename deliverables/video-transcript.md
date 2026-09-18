# GridWise solution video transcript

Synthetic narration. Review before submission. No secrets are shown.

## 1. GridWise

GridWise solves the BUP smart campus energy challenge. We receive twenty-four hours of demand, solar forecasts and grid tariffs, a battery specification, and one to three operator notes. Our NestJS service returns both the meaning of each note and a minimum-cost energy schedule. Correctness comes first: every applicable directive, battery limit and hourly energy balance must hold.

## 2. One service. A verified pipeline.

The pipeline separates language understanding from mathematics. OpenAI's Responses API converts the notes into strict structured output. Deterministic guardrails validate that output before the optimizer receives it. A separate replay checks the completed schedule before the API returns success. Both required endpoints and the Swagger documentation live in the same service. The API key stays in server environment configuration.

## 3. Interpret every note precisely

The interpreter supports solar reduction, minimum battery reserve, charging and discharging restrictions, a grid-import cap, and no operation for irrelevant notes. An eighty percent solar reduction leaves twenty percent usable. A reserve expressed as a percentage uses the actual battery capacity. Every time window includes its start and excludes its end. Each note receives exactly one ordered interpretation. We do not hard-code sample wording or schedules.

## 4. Optimize the full day together

The optimizer uses seventy-two continuous variables: grid import, used solar, and stored energy for each hour. It minimizes total tariff-weighted grid cost. The change in stored energy defines one charging, discharging or idle action, avoiding simultaneous charging and discharging. Constraints enforce available solar, battery reserves and rates, maintenance windows and grid caps. Final stored energy must equal its initial value. This plans ahead for expensive or constrained hours.

## 5. Verify meaning, physics and cost

Validation rejects unsupported types, incorrect mappings, duplicate or unsorted hours, invalid numbers and out-of-range reserves. The final replay recomputes energy balance, transitions, directive compliance and totals. Tests compare all ten public cases with organizer ground truth and optimal costs. Additional paraphrases exercise language variation, while one hundred generated cases compare optimization against an independent dynamic-programming oracle. Provider failures produce controlled errors, and only validated interpretations are cached.

## 6. Run, test, deploy

To run locally, install dependencies, put the OpenAI key in the ignored environment file, build, and start the service. Open slash docs for Swagger. Run npm test for offline verification and npm run test colon live for real OpenAI end-to-end checks. The README includes sample curl requests and Docker pull and run instructions. For submission, publish one reachable API, a pullable image with an exact version, the repository with the required visibility, and this video.
