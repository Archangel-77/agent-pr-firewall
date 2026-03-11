import { describe, expect, it } from "vitest";

import { evaluatePolicies } from "../../../src/policies/engine.js";
import type { PullRequestWebhookPayload } from "../../../src/types/github.js";

function createPayload(
  overrides: Partial<PullRequestWebhookPayload> = {},
): PullRequestWebhookPayload {
  return {
    action: "opened",
    number: 42,
    installation: { id: 1234 },
    repository: {
      full_name: "acme/agent-pr-firewall",
      name: "agent-pr-firewall",
      owner: { login: "acme" },
    },
    pull_request: {
      html_url: "https://github.com/acme/agent-pr-firewall/pull/42",
      title: "Add policy engine",
      body: "This PR introduces a policy evaluation engine and report publishing.",
      draft: false,
      head: { sha: "abc123" },
      user: { login: "octocat" },
    },
    ...overrides,
  };
}

describe("evaluatePolicies", () => {
  it("returns pass when no policies trigger", async () => {
    const payload = createPayload();
    const result = await evaluatePolicies({ payload });

    expect(result.decision).toBe("pass");
    expect(result.findings).toEqual([]);
  });

  it("returns warn when description policy triggers", async () => {
    const payload = createPayload({
      pull_request: {
        ...createPayload().pull_request,
        body: "short",
      },
    });

    const result = await evaluatePolicies({ payload });
    expect(result.decision).toBe("warn");
    expect(result.findings.some((finding) => finding.policyId === "pr-description")).toBe(true);
  });

  it("returns block when draft policy triggers", async () => {
    const payload = createPayload({
      pull_request: {
        ...createPayload().pull_request,
        draft: true,
      },
    });

    const result = await evaluatePolicies({ payload });
    expect(result.decision).toBe("block");
    expect(result.findings.some((finding) => finding.policyId === "draft-pr")).toBe(true);
  });
});
