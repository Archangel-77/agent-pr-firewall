import { evaluatePolicies } from "../policies/engine.js";
import type { PullRequestWebhookPayload } from "../types/github.js";
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
  reporter: PullRequestReporter;
}

export async function handlePullRequestEvent(
  payload: PullRequestWebhookPayload,
  logger: AppLogger,
  dependencies: PullRequestEventDependencies,
): Promise<void> {
  const { action, number, repository, pull_request: pullRequest } = payload;

  if (!isSupportedPullRequestAction(action)) {
    logger.debug(
      { action, repository: repository.full_name, pullRequestNumber: number },
      "Ignoring unsupported pull_request action",
    );
    return;
  }

  const evaluation = await evaluatePolicies({ payload });

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
      decision: evaluation.decision,
      findings: evaluation.findings.map((finding) => ({
        policyId: finding.policyId,
        severity: finding.severity,
      })),
    },
    "Evaluated pull request policies",
  );

  const installationId = payload.installation?.id;
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
