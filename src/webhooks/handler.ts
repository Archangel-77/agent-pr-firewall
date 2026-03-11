import type { IncomingHttpHeaders } from "node:http";

import { Webhooks } from "@octokit/webhooks";

import type { AppEnv } from "../config/env.js";
import { GitHubApiClient } from "../github/client.js";
import { PullRequestReporter } from "../github/reporter.js";
import type { PullRequestWebhookPayload } from "../types/github.js";
import type { AppLogger } from "../utils/logger.js";
import { handlePullRequestEvent } from "./pull-request.js";

export interface WebhookProcessingResult {
  statusCode: number;
  message: string;
}

function getHeader(headers: IncomingHttpHeaders, name: string): string | null {
  const value = headers[name.toLowerCase()];

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPullRequestPayload(payload: unknown): payload is PullRequestWebhookPayload {
  if (!isRecord(payload)) {
    return false;
  }

  const hasValidInstallation =
    payload.installation === undefined ||
    (isRecord(payload.installation) && typeof payload.installation.id === "number");

  if (
    !hasValidInstallation ||
    typeof payload.action !== "string" ||
    typeof payload.number !== "number" ||
    !isRecord(payload.repository) ||
    typeof payload.repository.full_name !== "string" ||
    typeof payload.repository.name !== "string" ||
    !isRecord(payload.repository.owner) ||
    typeof payload.repository.owner.login !== "string" ||
    !isRecord(payload.pull_request)
  ) {
    return false;
  }

  const pullRequest = payload.pull_request;

  return (
    typeof pullRequest.html_url === "string" &&
    typeof pullRequest.title === "string" &&
    (typeof pullRequest.body === "string" || pullRequest.body === null) &&
    typeof pullRequest.draft === "boolean" &&
    isRecord(pullRequest.head) &&
    typeof pullRequest.head.sha === "string" &&
    isRecord(pullRequest.user) &&
    typeof pullRequest.user.login === "string"
  );
}

export function createGitHubWebhookHandler(env: AppEnv, logger: AppLogger) {
  const webhooks = new Webhooks({ secret: env.GITHUB_WEBHOOK_SECRET });
  const githubClient = new GitHubApiClient(env, logger);
  const reporter = new PullRequestReporter(githubClient, logger);

  return async function processGitHubWebhook(
    headers: IncomingHttpHeaders,
    rawBody: string,
  ): Promise<WebhookProcessingResult> {
    const eventName = getHeader(headers, "x-github-event");
    const deliveryId = getHeader(headers, "x-github-delivery");
    const signature = getHeader(headers, "x-hub-signature-256");

    if (!eventName || !deliveryId || !signature) {
      return {
        statusCode: 400,
        message: "Missing required GitHub webhook headers",
      };
    }

    const isValidSignature = await webhooks.verify(rawBody, signature);

    if (!isValidSignature) {
      logger.warn({ deliveryId, eventName }, "Rejected webhook with invalid signature");
      return {
        statusCode: 401,
        message: "Invalid webhook signature",
      };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody) as unknown;
    } catch (error) {
      logger.warn({ deliveryId, eventName, err: error }, "Webhook payload is not valid JSON");
      return {
        statusCode: 400,
        message: "Invalid JSON payload",
      };
    }

    if (eventName !== "pull_request") {
      logger.debug({ deliveryId, eventName }, "Ignoring unsupported GitHub event");
      return {
        statusCode: 202,
        message: "Ignored unsupported event",
      };
    }

    if (!isPullRequestPayload(payload)) {
      logger.warn({ deliveryId }, "pull_request payload did not match expected shape");
      return {
        statusCode: 400,
        message: "Invalid pull_request payload",
      };
    }

    await handlePullRequestEvent(payload, logger, {
      githubClient,
      reporter,
      protectedPathPrefixes: env.FIREWALL_PROTECTED_PATH_PREFIXES,
      sizeThresholds: {
        warnChangedFiles: env.FIREWALL_MAX_CHANGED_FILES_WARN,
        blockChangedFiles: env.FIREWALL_MAX_CHANGED_FILES_BLOCK,
        warnChangedLines: env.FIREWALL_MAX_CHANGED_LINES_WARN,
        blockChangedLines: env.FIREWALL_MAX_CHANGED_LINES_BLOCK,
      },
    });

    return {
      statusCode: 202,
      message: "Accepted",
    };
  };
}
