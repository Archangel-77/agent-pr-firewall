import { describe, expect, it } from "vitest";

import { issueReferencePolicy } from "../../../../src/policies/rules/issue-reference-policy.js";
import type { PolicyContext } from "../../../../src/policies/types.js";
import type { PullRequestWebhookPayload } from "../../../../src/types/github.js";

function createPayload(body: string | null): PullRequestWebhookPayload {
  return {
    action: "opened",
    number: 11,
    installation: { id: 1000 },
    repository: {
      full_name: "acme/example",
      name: "example",
      owner: { login: "acme" },
    },
    pull_request: {
      html_url: "https://github.com/acme/example/pull/11",
      title: "Feature update",
      body,
      draft: false,
      head: { sha: "deadbeef" },
      user: { login: "octocat" },
    },
  };
}

function createContext(body: string | null): PolicyContext {
  return {
    payload: createPayload(body),
    pullRequestFiles: [],
    settings: {
      protectedPathPrefixes: [],
    },
  };
}

describe("issueReferencePolicy", () => {
  it("passes when a GitHub issue reference exists", async () => {
    const result = await issueReferencePolicy.evaluate(createContext("Fixes #123"));
    expect(result).toBeNull();
  });

  it("passes when a ticket ID exists", async () => {
    const result = await issueReferencePolicy.evaluate(createContext("Related: SEC-991"));
    expect(result).toBeNull();
  });

  it("blocks when no reference exists", async () => {
    const result = await issueReferencePolicy.evaluate(createContext("Improves performance"));
    expect(result?.severity).toBe("block");
    expect(result?.policyId).toBe("issue-reference");
  });
});
