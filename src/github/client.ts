import { createAppAuth } from "@octokit/auth-app";

import type { AppEnv } from "../config/env.js";
import type { AppLogger } from "../utils/logger.js";

const GITHUB_ACCEPT_HEADER = "application/vnd.github+json";
const GITHUB_API_VERSION = "2022-11-28";

interface InstallationAuthResult {
  token: string;
}

export interface IssueComment {
  id: number;
  body: string;
}

interface UpsertCommentInput {
  installationId: number;
  owner: string;
  repo: string;
  issueNumber: number;
  marker: string;
  body: string;
}

interface CreateCheckRunInput {
  installationId: number;
  owner: string;
  repo: string;
  name: string;
  headSha: string;
  conclusion: "success" | "neutral" | "action_required" | "failure";
  title: string;
  summary: string;
  detailsUrl?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseIssueComment(value: unknown): IssueComment | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== "number" || typeof value.body !== "string") {
    return null;
  }

  return {
    id: value.id,
    body: value.body,
  };
}

export class GitHubApiClient {
  private readonly auth: ReturnType<typeof createAppAuth>;

  constructor(
    private readonly env: AppEnv,
    private readonly logger: AppLogger,
  ) {
    this.auth = createAppAuth({
      appId: this.env.GITHUB_APP_ID,
      privateKey: this.env.GITHUB_PRIVATE_KEY,
    });
  }

  private async getInstallationToken(installationId: number): Promise<string> {
    const authResult = (await this.auth({
      type: "installation",
      installationId,
    })) as InstallationAuthResult;

    return authResult.token;
  }

  private buildUrl(path: string): string {
    const baseUrl = this.env.GITHUB_API_BASE_URL.endsWith("/")
      ? this.env.GITHUB_API_BASE_URL
      : `${this.env.GITHUB_API_BASE_URL}/`;

    return new URL(path.replace(/^\//, ""), baseUrl).toString();
  }

  private async requestJson<T>(
    installationId: number,
    method: "GET" | "POST" | "PATCH",
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.getInstallationToken(installationId);
    const url = this.buildUrl(path);

    const requestInit: RequestInit = {
      method,
      headers: {
        accept: GITHUB_ACCEPT_HEADER,
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
        "x-github-api-version": GITHUB_API_VERSION,
        "user-agent": "agent-pr-firewall",
      },
    };

    if (body !== undefined) {
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestInit);

    if (!response.ok) {
      const responseBody = await response.text();
      throw new Error(
        `GitHub API request failed (${response.status} ${response.statusText}) on ${method} ${path}: ${responseBody}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private async listIssueComments(
    installationId: number,
    owner: string,
    repo: string,
    issueNumber: number,
  ): Promise<IssueComment[]> {
    const data = await this.requestJson<unknown[]>(
      installationId,
      "GET",
      `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`,
    );

    return data
      .map((item) => parseIssueComment(item))
      .filter((item): item is IssueComment => item !== null);
  }

  async upsertManagedIssueComment(input: UpsertCommentInput): Promise<void> {
    const comments = await this.listIssueComments(
      input.installationId,
      input.owner,
      input.repo,
      input.issueNumber,
    );

    const existingComment = comments.find((comment) => comment.body.includes(input.marker));

    if (existingComment) {
      await this.requestJson(
        input.installationId,
        "PATCH",
        `/repos/${input.owner}/${input.repo}/issues/comments/${existingComment.id}`,
        { body: input.body },
      );

      this.logger.info(
        {
          repository: `${input.owner}/${input.repo}`,
          issueNumber: input.issueNumber,
          commentId: existingComment.id,
        },
        "Updated managed pull request comment",
      );
      return;
    }

    await this.requestJson(
      input.installationId,
      "POST",
      `/repos/${input.owner}/${input.repo}/issues/${input.issueNumber}/comments`,
      { body: input.body },
    );

    this.logger.info(
      {
        repository: `${input.owner}/${input.repo}`,
        issueNumber: input.issueNumber,
      },
      "Created managed pull request comment",
    );
  }

  async createCheckRun(input: CreateCheckRunInput): Promise<void> {
    await this.requestJson(
      input.installationId,
      "POST",
      `/repos/${input.owner}/${input.repo}/check-runs`,
      {
        name: input.name,
        head_sha: input.headSha,
        status: "completed",
        conclusion: input.conclusion,
        details_url: input.detailsUrl,
        output: {
          title: input.title,
          summary: input.summary,
        },
      },
    );

    this.logger.info(
      {
        repository: `${input.owner}/${input.repo}`,
        headSha: input.headSha,
        checkRun: input.name,
        conclusion: input.conclusion,
      },
      "Created check run",
    );
  }
}
