# Reading the source

Start with [EnergyService](energy/services/energy.service.ts). Its `optimize()` method shows the complete business flow: interpret notes, validate directives, optimize, then independently verify the result.

```text
src/
├── main.ts                   Start the HTTP server
├── bootstrap.ts              Shared HTTP filter and Swagger setup
├── app.module.ts             Connect the feature modules
├── config/                   Environment configuration and its DI provider
├── common/
│   ├── filters/              Safe, consistent error responses
│   ├── swagger/              OpenAPI setup and schema conversion
│   └── validation/           Reusable scalar validation rules
├── health/                   Health module, controller and service
├── energy/
│   ├── energy.module.ts      Register the energy feature
│   ├── energy.controller.ts  HTTP route and Swagger decorators
│   ├── dto/                  Request and response contracts
│   ├── models/               Battery, input-hour and output-hour models
│   ├── pipes/                Validate incoming requests before the controller
│   ├── services/             Orchestration, optimization and independent replay
│   ├── optimization/         Construct the continuous linear program
│   └── errors/               Infeasibility error type
└── interpretation/
    ├── interpretation.module.ts
    ├── interfaces/           NoteInterpreter contract and injection token
    ├── models/               Supported directive schemas and types
    ├── providers/            Create the OpenAI client from server configuration
    ├── services/             LLM extraction, directive validation, bounded cache
    ├── prompts/              Versioned language interpretation instructions
    └── errors/               Safe provider/interpretation error type
```

Recommended reading order:

1. [EnergyController](energy/energy.controller.ts) → [request pipe](energy/pipes/optimize-energy-request.pipe.ts): how a request enters the system.
2. [Request DTO](energy/dto/optimize-energy-request.dto.ts) and [response DTO](energy/dto/optimize-energy-response.dto.ts): the exact API data shapes. Types are inferred from Zod schemas so Swagger, validation and TypeScript describe the same contract.
3. [EnergyService](energy/services/energy.service.ts): the four-step orchestration.
4. [OpenAI interpreter](interpretation/services/openai-interpreter.service.ts) and [directive validator](interpretation/services/directive-validator.service.ts): how natural language becomes validated constraints.
5. [LP model](energy/optimization/energy-lp.model.ts) and [optimizer service](energy/services/energy-optimizer.service.ts): build and solve the 72-variable problem, then map the solution to API actions.
6. [PlanReplayService](energy/services/plan-replay.service.ts): independently recheck each hour before returning success.

The production optimizer is **continuous LP solved by simplex** using `javascript-lp-solver`. Dynamic programming exists only in `test/helpers/dp-oracle.cjs` and the original test suite as an independent correctness oracle. There is no database in this challenge, so models describe the energy domain rather than ORM entities.

Controllers delegate to services. Nest creates the services through dependency injection. The energy and health services depend on the `NOTE_INTERPRETER` interface; only the interpretation feature knows the OpenAI SDK. Offline HTTP tests use Nest's `overrideProvider()` to replace the interpreter. Production bootstrap contains no test mocks or test-specific dependency switches.
