import { describe, expect, it } from "vitest";

import { protectedPathsPolicy } from "../../../../src/policies/rules/protected-paths-policy.js";
import type { PolicyContext } from "../../../../src/policies/types.js";
import type { PullRequestWebhookPayload } from "../../../../src/types/github.js";

function createPayload(): PullRequestWebhookPayload {
  return {
    action: "opened",
    number: 7,
    installation: { id: 1000 },
    repository: {
      full_name: "acme/example",
      name: "example",
      owner: { login: "acme" },
    },
    pull_request: {
      html_url: "https://github.com/acme/example/pull/7",
      title: "Update infra",
      body: "Refs #123",
      draft: false,
      head: { sha: "deadbeef" },
      user: { login: "octocat" },
    },
  };
}

function createContext(fileNames: string[]): PolicyContext {
  return {
    payload: createPayload(),
    pullRequestFiles: fileNames.map((filename) => ({
      filename,
      status: "modified",
    })),
    settings: {
      protectedPathPrefixes: ["infra/", ".github/workflows/"],
    },
  };
}

describe("protectedPathsPolicy", () => {
  it("blocks when protected paths are modified", async () => {
    const result = await protectedPathsPolicy.evaluate(
      createContext(["src/index.ts", "infra/main.tf"]),
    );

    expect(result?.severity).toBe("block");
    expect(result?.policyId).toBe("protected-paths");
    expect(result?.message).toContain("infra/main.tf");
  });

  it("passes when protected paths are untouched", async () => {
    const result = await protectedPathsPolicy.evaluate(createContext(["src/index.ts"]));
    expect(result).toBeNull();
  });
});
