export class InterpretationFailure extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
