import { defaultPolicies } from "./default-policies.js";
import type { Policy, PolicyContext, PolicyDecision, PolicyEvaluation, PolicyFinding } from "./types.js";

function resolveDecision(findings: PolicyFinding[]): PolicyDecision {
  if (findings.some((finding) => finding.severity === "block")) {
    return "block";
  }

  if (findings.some((finding) => finding.severity === "warn")) {
    return "warn";
  }

  return "pass";
}

export async function evaluatePolicies(
  context: PolicyContext,
  policies: readonly Policy[] = defaultPolicies,
): Promise<PolicyEvaluation> {
  const findings: PolicyFinding[] = [];

  for (const policy of policies) {
    const result = await policy.evaluate(context);
    if (result) {
      findings.push(result);
    }
  }

  return {
    decision: resolveDecision(findings),
    findings,
  };
}
