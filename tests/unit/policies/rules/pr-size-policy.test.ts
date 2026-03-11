import { describe, expect, it } from "vitest";

import { pullRequestSizePolicy } from "../../../../src/policies/rules/pr-size-policy.js";
import type { PolicyContext } from "../../../../src/policies/types.js";
import type { PullRequestWebhookPayload } from "../../../../src/types/github.js";

function createPayload(): PullRequestWebhookPayload {
  return {
    action: "opened",
    number: 22,
    installation: { id: 1000 },
    repository: {
      full_name: "acme/example",
      name: "example",
      owner: { login: "acme" },
    },
    pull_request: {
      html_url: "https://github.com/acme/example/pull/22",
      title: "Large refactor",
      body: "Refs #123",
      draft: false,
      head: { sha: "deadbeef" },
      user: { login: "octocat" },
    },
  };
}

function createContext(changedFiles: number, patch?: string): PolicyContext {
  return {
    payload: createPayload(),
    pullRequestFiles: Array.from({ length: changedFiles }).map((_, index) => {
      const file = {
        filename: `src/file-${index}.ts`,
        status: "modified",
      };

      if (typeof patch === "string") {
        return { ...file, patch };
      }

      return file;
    }),
    settings: {
      protectedPathPrefixes: [],
      sizeThresholds: {
        warnChangedFiles: 2,
        blockChangedFiles: 4,
        warnChangedLines: 10,
        blockChangedLines: 20,
      },
    },
  };
}

describe("pullRequestSizePolicy", () => {
  it("passes when below all thresholds", async () => {
    const result = await pullRequestSizePolicy.evaluate(createContext(1, "+const a = 1;"));
    expect(result).toBeNull();
  });

  it("warns when warn file threshold is exceeded", async () => {
    const result = await pullRequestSizePolicy.evaluate(createContext(3, "+const a = 1;"));
    expect(result?.severity).toBe("warn");
    expect(result?.policyId).toBe("pr-size");
  });

  it("blocks when block line threshold is exceeded", async () => {
    const patch = new Array(25).fill("+line").join("\n");
    const result = await pullRequestSizePolicy.evaluate(createContext(1, patch));

    expect(result?.severity).toBe("block");
    expect(result?.policyId).toBe("pr-size");
  });
});
