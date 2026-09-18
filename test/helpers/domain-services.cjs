require("reflect-metadata");
const {
  EnergyOptimizerService,
} = require("../../dist/energy/services/energy-optimizer.service");
const {
  DirectiveValidatorService,
} = require("../../dist/interpretation/services/directive-validator.service");
const {
  PlanReplayService,
} = require("../../dist/energy/services/plan-replay.service");

const validator = new DirectiveValidatorService();
module.exports = {
  validator,
  optimizer: new EnergyOptimizerService(),
  planReplay: new PlanReplayService(validator),
};
