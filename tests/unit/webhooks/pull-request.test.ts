import { describe, expect, it, vi } from "vitest";

import type { AppObservability } from "../../../src/observability/types.js";
import type { PullRequestReporter } from "../../../src/github/reporter.js";
import type { PolicyEvaluation } from "../../../src/policies/types.js";
import type { PullRequestWebhookPayload } from "../../../src/types/github.js";
import type { AppLogger } from "../../../src/utils/logger.js";
import { handlePullRequestEvent } from "../../../src/webhooks/pull-request.js";

function createPayload(): PullRequestWebhookPayload {
  return {
    action: "opened",
    number: 14,
    installation: { id: 2000 },
    repository: {
      full_name: "acme/example",
      name: "example",
      owner: { login: "acme" },
    },
    pull_request: {
      html_url: "https://github.com/acme/example/pull/14",
      title: "Harden firewall policies",
      body: "Implements firewall hardening and references issue #100 for tracking.",
      draft: false,
      head: { sha: "cafebabe" },
      user: { login: "octocat" },
    },
  };
}

function createLogger(): AppLogger {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as AppLogger;
}

function createObservability(): AppObservability {
  return {
    metrics: {
      incrementFileInspectionFailure: vi.fn(),
      incrementPolicyDecision: vi.fn(),
      incrementPolicyFinding: vi.fn(),
    },
    fileInspectionAlertMonitor: {
      recordFailure: vi.fn(() => ({
        shouldAlert: false,
        recentFailureCount: 1,
      })),
    },
  } as unknown as AppObservability;
}

describe("handlePullRequestEvent", () => {
  it("publishes a report for supported actions", async () => {
    const payload = createPayload();
    const logger = createLogger();
    const observability = createObservability();
    const report = vi.fn<(_: { evaluation: PolicyEvaluation }) => Promise<void>>().mockResolvedValue();
    const listPullRequestFiles = vi
      .fn<(_: number, __: string, ___: string, ____: number) => Promise<{ filename: string; status: string }[]>>()
      .mockResolvedValue([{ filename: "src/index.ts", status: "modified" }]);

    await handlePullRequestEvent(payload, logger, {
      githubClient: {
        listPullRequestFiles,
      } as never,
      reporter: {
        report,
      } as unknown as PullRequestReporter,
      protectedPathPrefixes: ["infra/"],
      sizeThresholds: {
        warnChangedFiles: 25,
        blockChangedFiles: 75,
        warnChangedLines: 800,
        blockChangedLines: 2000,
      },
      observability,
    });

    expect(listPullRequestFiles).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledOnce();
    expect(report.mock.calls[0]?.[0].evaluation.decision).toBe("pass");
  });

  it("blocks evaluation when file inspection fails", async () => {
    const payload = createPayload();
    const logger = createLogger();
    const observability = createObservability();
    const report = vi.fn<(_: { evaluation: PolicyEvaluation }) => Promise<void>>().mockResolvedValue();
    const listPullRequestFiles = vi
      .fn<(_: number, __: string, ___: string, ____: number) => Promise<{ filename: string; status: string }[]>>()
      .mockRejectedValue(new Error("api unavailable"));

    await handlePullRequestEvent(payload, logger, {
      githubClient: {
        listPullRequestFiles,
      } as never,
      reporter: {
        report,
      } as unknown as PullRequestReporter,
      protectedPathPrefixes: ["infra/"],
      sizeThresholds: {
        warnChangedFiles: 25,
        blockChangedFiles: 75,
        warnChangedLines: 800,
        blockChangedLines: 2000,
      },
      observability,
    });

    const evaluation = report.mock.calls[0]?.[0].evaluation;
    expect(evaluation?.decision).toBe("block");
    expect(evaluation?.findings.some((finding) => finding.policyId === "file-inspection")).toBe(true);
  });
});
