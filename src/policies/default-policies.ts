import { draftPullRequestPolicy } from "./rules/draft-pr-policy.js";
import { issueReferencePolicy } from "./rules/issue-reference-policy.js";
import { pullRequestDescriptionPolicy } from "./rules/pr-description-policy.js";
import { protectedPathsPolicy } from "./rules/protected-paths-policy.js";
import { secretPatternPolicy } from "./rules/secret-pattern-policy.js";
import type { Policy } from "./types.js";

export const defaultPolicies: readonly Policy[] = [
  draftPullRequestPolicy,
  issueReferencePolicy,
  protectedPathsPolicy,
  secretPatternPolicy,
  pullRequestDescriptionPolicy,
];
