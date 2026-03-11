import { describe, expect, it } from "vitest";

import { secretPatternPolicy } from "../../../../src/policies/rules/secret-pattern-policy.js";
import type { PolicyContext } from "../../../../src/policies/types.js";
import type { PullRequestWebhookPayload } from "../../../../src/types/github.js";

function createPayload(): PullRequestWebhookPayload {
  return {
    action: "opened",
    number: 13,
    installation: { id: 1000 },
    repository: {
      full_name: "acme/example",
      name: "example",
      owner: { login: "acme" },
    },
    pull_request: {
      html_url: "https://github.com/acme/example/pull/13",
      title: "Update config",
      body: "Refs #33",
      draft: false,
      head: { sha: "deadbeef" },
      user: { login: "octocat" },
    },
  };
}

function createContext(patch: string): PolicyContext {
  return {
    payload: createPayload(),
    pullRequestFiles: [
      {
        filename: "config/settings.env",
        status: "modified",
        patch,
      },
    ],
    settings: {
      protectedPathPrefixes: [],
      sizeThresholds: {
        warnChangedFiles: 25,
        blockChangedFiles: 75,
        warnChangedLines: 800,
        blockChangedLines: 2000,
      },
    },
  };
}

describe("secretPatternPolicy", () => {
  it("blocks when secret-like values are added", async () => {
    const result = await secretPatternPolicy.evaluate(
      createContext("+API_KEY='abcdefghijklmnop123456'"),
    );

    expect(result?.severity).toBe("block");
    expect(result?.policyId).toBe("secret-patterns");
  });

  it("passes when no suspicious additions are present", async () => {
    const result = await secretPatternPolicy.evaluate(
      createContext("+const greeting = 'hello world';"),
    );

    expect(result).toBeNull();
  });
});
