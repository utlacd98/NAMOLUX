export type DecisionWorkspaceEnvironment = {
  NAMOLUX_DECISION_WORKSPACE_ENABLED?: string
}

/**
 * A fail-closed rollout switch for the new public workflow. It defaults on so
 * previews exercise the same workspace; set the variable to `false` to stop
 * new jobs immediately while preserving saved Pro work and the landing page.
 */
export function isDecisionWorkspaceEnabled(
  environment: DecisionWorkspaceEnvironment = process.env as DecisionWorkspaceEnvironment,
): boolean {
  return environment.NAMOLUX_DECISION_WORKSPACE_ENABLED?.trim().toLowerCase() !== "false"
}
