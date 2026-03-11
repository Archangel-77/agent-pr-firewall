import type { Policy, PolicyContext } from "../types.js";

export const draftPullRequestPolicy: Policy = {
  id: "draft-pr",
  evaluate(context: PolicyContext) {
    if (!context.payload.pull_request.draft) {
      return null;
    }

    return {
      policyId: "draft-pr",
      severity: "block",
      title: "Pull request is still draft",
      message: "Mark the pull request as ready for review before it can pass firewall checks.",
    };
  },
};
