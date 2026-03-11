import type { Policy, PolicyContext } from "../types.js";

const MIN_DESCRIPTION_LENGTH = 30;

function getTrimmedBody(context: PolicyContext): string {
  const body = context.payload.pull_request.body;
  return typeof body === "string" ? body.trim() : "";
}

export const pullRequestDescriptionPolicy: Policy = {
  id: "pr-description",
  evaluate(context: PolicyContext) {
    const body = getTrimmedBody(context);

    if (body.length >= MIN_DESCRIPTION_LENGTH) {
      return null;
    }

    return {
      policyId: "pr-description",
      severity: "warn",
      title: "Pull request description is too short",
      message: `Add at least ${MIN_DESCRIPTION_LENGTH} characters to explain the intent and risk of this change.`,
    };
  },
};
