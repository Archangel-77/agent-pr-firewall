import { evaluatePolicies } from "../policies/engine.js";
import type { GitHubApiClient } from "../github/client.js";
import type { PolicyEvaluation } from "../policies/types.js";
import type { GitHubPullRequestFile, PullRequestWebhookPayload } from "../types/github.js";
import type { AppLogger } from "../utils/logger.js";
import type { PullRequestReporter } from "../github/reporter.js";

const supportedActions = new Set([
  "opened",
  "edited",
  "reopened",
  "synchronize",
  "ready_for_review",
]);

export function isSupportedPullRequestAction(action: string): boolean {
  return supportedActions.has(action);
}

export interface PullRequestEventDependencies {
  githubClient: GitHubApiClient;
  reporter: PullRequestReporter;
  protectedPathPrefixes: readonly string[];
}

function withFileInspectionFailure(evaluation: PolicyEvaluation): PolicyEvaluation {
  return {
    decision: "block",
    findings: [
      ...evaluation.findings,
      {
        policyId: "file-inspection",
        severity: "block",
        title: "Could not inspect changed files",
        message: "GitHub API file inspection failed. Re-run the firewall check when GitHub API is available.",
      },
    ],
  };
}

export async function handlePullRequestEvent(
  payload: PullRequestWebhookPayload,
  logger: AppLogger,
  dependencies: PullRequestEventDependencies,
): Promise<void> {
  const { action, number, repository, pull_request: pullRequest } = payload;
  const installationId = payload.installation?.id;

  if (!isSupportedPullRequestAction(action)) {
    logger.debug(
      { action, repository: repository.full_name, pullRequestNumber: number },
      "Ignoring unsupported pull_request action",
    );
    return;
  }

  let pullRequestFiles: GitHubPullRequestFile[] = [];
  let fileInspectionFailed = false;
  if (installationId) {
    try {
      pullRequestFiles = await dependencies.githubClient.listPullRequestFiles(
        installationId,
        repository.owner.login,
        repository.name,
        number,
      );
    } catch (error) {
      logger.warn(
        {
          repository: repository.full_name,
          pullRequestNumber: number,
          err: error,
        },
        "Failed to list pull request files; marking evaluation as blocked",
      );
      fileInspectionFailed = true;
    }
  }

  let evaluation = await evaluatePolicies({
    payload,
    pullRequestFiles,
    settings: {
      protectedPathPrefixes: dependencies.protectedPathPrefixes,
    },
  });

  if (fileInspectionFailed) {
    evaluation = withFileInspectionFailure(evaluation);
  }

  logger.info(
    {
      event: "pull_request",
      action,
      repository: repository.full_name,
      pullRequestNumber: number,
      draft: pullRequest.draft,
      title: pullRequest.title,
      url: pullRequest.html_url,
      author: pullRequest.user.login,
      changedFiles: pullRequestFiles.length,
      decision: evaluation.decision,
      findings: evaluation.findings.map((finding) => ({
        policyId: finding.policyId,
        severity: finding.severity,
      })),
    },
    "Evaluated pull request policies",
  );

  if (!installationId) {
    logger.warn(
      { repository: repository.full_name, pullRequestNumber: number },
      "Cannot publish report because webhook has no installation id",
    );
    return;
  }

  await dependencies.reporter.report({
    installationId,
    owner: repository.owner.login,
    repo: repository.name,
    pullRequestNumber: number,
    pullRequestUrl: pullRequest.html_url,
    headSha: pullRequest.head.sha,
    evaluation,
  });
}
