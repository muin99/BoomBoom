const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  optimizer,
  validator,
  planReplay,
} = require("./helpers/domain-services.cjs");
const {
  InfeasibleScenario,
} = require("../dist/energy/errors/infeasible-scenario.error");
const { optimalCostByDynamicProgramming } = require("./helpers/dp-oracle.cjs");
const {
  languageEdgeCases,
  generatedNumericCases,
} = require("./fixtures/judge-cases.cjs");

for (const fixture of languageEdgeCases()) {
  test(`${fixture.id}: schedule and cost agree with independent oracle`, () => {
    const directives = validator.validate(
      {
        directive_interpretation:
          fixture.expected_output.directive_interpretation,
      },
      fixture.input,
    );
    const plan = planReplay.verify(
      fixture.input,
      optimizer.optimize(fixture.input, directives),
      directives,
    );
    assert.ok(
      Math.abs(plan.total_cost_bdt - fixture.expected_output.total_cost_bdt) <=
        1e-5,
    );
  });
}

test("500 generated fractional scenarios with directives match independent DP feasibility and optimal cost", () => {
  let feasible = 0,
    infeasible = 0;
  for (const { input, directives, quantum } of generatedNumericCases()) {
    validator.validate({ directive_interpretation: directives }, input);
    const expected = optimalCostByDynamicProgramming(
      input,
      directives,
      quantum,
    );
    if (!Number.isFinite(expected)) {
      assert.throws(
        () => optimizer.optimize(input, directives),
        InfeasibleScenario,
        input.scenario_id,
      );
      infeasible++;
    } else {
      const plan = planReplay.verify(
        input,
        optimizer.optimize(input, directives),
        directives,
      );
      assert.ok(
        Math.abs(plan.total_cost_bdt - expected) < 1e-5,
        input.scenario_id,
      );
      feasible++;
    }
  }
  assert.ok(feasible > 0 && infeasible > 0);
  console.log(
    `Independent oracle: ${feasible} feasible and ${infeasible} infeasible generated cases verified.`,
  );
});
