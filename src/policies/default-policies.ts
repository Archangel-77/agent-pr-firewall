import { draftPullRequestPolicy } from "./rules/draft-pr-policy.js";
import { pullRequestDescriptionPolicy } from "./rules/pr-description-policy.js";
import type { Policy } from "./types.js";

export const defaultPolicies: readonly Policy[] = [
  draftPullRequestPolicy,
  pullRequestDescriptionPolicy,
];
