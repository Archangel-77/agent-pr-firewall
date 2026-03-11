import type { GitHubPullRequestFile, PullRequestWebhookPayload } from "../types/github.js";

export type PolicySeverity = "warn" | "block";
export type PolicyDecision = "pass" | PolicySeverity;

export interface PolicyFinding {
  policyId: string;
  severity: PolicySeverity;
  title: string;
  message: string;
}

export interface PolicyContext {
  payload: PullRequestWebhookPayload;
  pullRequestFiles: readonly GitHubPullRequestFile[];
  settings: {
    protectedPathPrefixes: readonly string[];
    sizeThresholds: {
      warnChangedFiles: number;
      blockChangedFiles: number;
      warnChangedLines: number;
      blockChangedLines: number;
    };
  };
}

export interface Policy {
  id: string;
  evaluate(context: PolicyContext): Promise<PolicyFinding | null> | PolicyFinding | null;
}

export interface PolicyEvaluation {
  decision: PolicyDecision;
  findings: PolicyFinding[];
}
