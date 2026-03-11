import type { PolicyEvaluation, PolicyFinding } from "../policies/types.js";
import type { AppLogger } from "../utils/logger.js";
import type { GitHubApiClient } from "./client.js";

const MANAGED_COMMENT_MARKER = "<!-- agent-pr-firewall:managed-comment -->";
const CHECK_RUN_NAME = "agent-pr-firewall";

export interface PullRequestReportContext {
  installationId: number;
  owner: string;
  repo: string;
  pullRequestNumber: number;
  pullRequestUrl: string;
  headSha: string;
  evaluation: PolicyEvaluation;
}

function toCheckRunConclusion(
  decision: PolicyEvaluation["decision"],
): "success" | "neutral" | "action_required" {
  if (decision === "block") {
    return "action_required";
  }

  if (decision === "warn") {
    return "neutral";
  }

  return "success";
}

function findingLine(finding: PolicyFinding): string {
  const severity = finding.severity.toUpperCase();
  return `- [${severity}] **${finding.title}** (${finding.policyId})\n  ${finding.message}`;
}

function buildCommentBody(context: PullRequestReportContext): string {
  const { evaluation } = context;
  const decision = evaluation.decision.toUpperCase();
  const findingsSection =
    evaluation.findings.length > 0
      ? evaluation.findings.map((finding) => findingLine(finding)).join("\n")
      : "- No policy findings.";

  return [
    MANAGED_COMMENT_MARKER,
    "## Agent PR Firewall Report",
    "",
    `Decision: **${decision}**`,
    `PR: ${context.pullRequestUrl}`,
    "",
    "### Findings",
    findingsSection,
  ].join("\n");
}

function buildCheckRunSummary(evaluation: PolicyEvaluation): string {
  if (evaluation.findings.length === 0) {
    return "No policy findings.";
  }

  return evaluation.findings
    .map((finding) => `- [${finding.severity.toUpperCase()}] ${finding.title}: ${finding.message}`)
    .join("\n");
}

export class PullRequestReporter {
  constructor(
    private readonly githubClient: GitHubApiClient,
    private readonly logger: AppLogger,
  ) {}

  async report(context: PullRequestReportContext): Promise<void> {
    const commentBody = buildCommentBody(context);
    const checkRunConclusion = toCheckRunConclusion(context.evaluation.decision);

    let commentPublished = true;
    try {
      await this.githubClient.upsertManagedIssueComment({
        installationId: context.installationId,
        owner: context.owner,
        repo: context.repo,
        issueNumber: context.pullRequestNumber,
        marker: MANAGED_COMMENT_MARKER,
        body: commentBody,
      });
    } catch (error) {
      commentPublished = false;
      this.logger.warn(
        {
          repository: `${context.owner}/${context.repo}`,
          pullRequestNumber: context.pullRequestNumber,
          err: error,
        },
        "Failed to publish managed pull request comment; continuing with check run",
      );
    }

    await this.githubClient.createCheckRun({
      installationId: context.installationId,
      owner: context.owner,
      repo: context.repo,
      name: CHECK_RUN_NAME,
      headSha: context.headSha,
      conclusion: checkRunConclusion,
      title: `Agent PR Firewall: ${context.evaluation.decision.toUpperCase()}`,
      summary: buildCheckRunSummary(context.evaluation),
      detailsUrl: context.pullRequestUrl,
    });

    this.logger.info(
      {
        repository: `${context.owner}/${context.repo}`,
        pullRequestNumber: context.pullRequestNumber,
        decision: context.evaluation.decision,
        findingCount: context.evaluation.findings.length,
        commentPublished,
      },
      "Published PR firewall report",
    );
  }
}
