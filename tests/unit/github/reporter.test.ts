import { describe, expect, it, vi } from "vitest";

import { PullRequestReporter } from "../../../src/github/reporter.js";
import type { PolicyEvaluation } from "../../../src/policies/types.js";
import type { AppLogger } from "../../../src/utils/logger.js";

function createLogger(): AppLogger {
  return {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as AppLogger;
}

function createContext() {
  const evaluation: PolicyEvaluation = {
    decision: "pass",
    findings: [],
  };

  return {
    installationId: 123,
    owner: "acme",
    repo: "example",
    pullRequestNumber: 99,
    pullRequestUrl: "https://github.com/acme/example/pull/99",
    headSha: "cafebabe123",
    evaluation,
  };
}

describe("PullRequestReporter", () => {
  it("creates check run even when managed comment publishing fails", async () => {
    const logger = createLogger();
    const upsertManagedIssueComment = vi.fn().mockRejectedValue(new Error("403 Forbidden"));
    const createCheckRun = vi.fn().mockResolvedValue(undefined);

    const reporter = new PullRequestReporter(
      {
        upsertManagedIssueComment,
        createCheckRun,
      } as never,
      logger,
    );

    await expect(reporter.report(createContext())).resolves.toBeUndefined();
    expect(upsertManagedIssueComment).toHaveBeenCalledOnce();
    expect(createCheckRun).toHaveBeenCalledOnce();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("fails when check run creation fails", async () => {
    const logger = createLogger();
    const upsertManagedIssueComment = vi.fn().mockResolvedValue(undefined);
    const createCheckRun = vi.fn().mockRejectedValue(new Error("check run failed"));

    const reporter = new PullRequestReporter(
      {
        upsertManagedIssueComment,
        createCheckRun,
      } as never,
      logger,
    );

    await expect(reporter.report(createContext())).rejects.toThrow("check run failed");
    expect(upsertManagedIssueComment).toHaveBeenCalledOnce();
    expect(createCheckRun).toHaveBeenCalledOnce();
  });
});
