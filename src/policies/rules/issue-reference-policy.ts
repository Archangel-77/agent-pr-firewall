import type { Policy, PolicyContext } from "../types.js";

const issueReferencePattern =
  /(?:#[0-9]+)|(?:[A-Z][A-Z0-9]+-[0-9]+)|(?:https?:\/\/[^\s]+\/issues\/[0-9]+)/;

function getBody(context: PolicyContext): string {
  const value = context.payload.pull_request.body;
  return typeof value === "string" ? value : "";
}

export const issueReferencePolicy: Policy = {
  id: "issue-reference",
  evaluate(context: PolicyContext) {
    const body = getBody(context);

    if (issueReferencePattern.test(body)) {
      return null;
    }

    return {
      policyId: "issue-reference",
      severity: "block",
      title: "Missing issue reference",
      message: "Reference an issue or ticket in the PR description (for example #123 or ABC-123).",
    };
  },
};
