/**
 * Without this, React logs "The current testing environment is not configured
 * to support act(...)" and does not guarantee effects have flushed — which
 * would make the tier-2 tests pass or fail for reasons unrelated to the code.
 */
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

export {};
