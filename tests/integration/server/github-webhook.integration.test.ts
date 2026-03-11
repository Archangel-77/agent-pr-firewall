import { createHmac, randomUUID } from "node:crypto";
import { type AddressInfo } from "node:net";
import { request } from "node:http";

import { afterEach, describe, expect, it } from "vitest";

import type { AppEnv } from "../../../src/config/env.js";
import { createHttpServer } from "../../../src/server/http.js";
import { createLogger } from "../../../src/utils/logger.js";

interface HttpResponse {
  statusCode: number;
  body: string;
}

const webhookSecret = "integration-test-secret";

function createEnv(): AppEnv {
  return {
    NODE_ENV: "test",
    PORT: 0,
    LOG_LEVEL: "silent",
    LOG_FILE_PATH: "",
    GITHUB_API_BASE_URL: "https://api.github.com",
    GITHUB_APP_ID: 123,
    GITHUB_WEBHOOK_SECRET: webhookSecret,
    GITHUB_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nTEST\n-----END PRIVATE KEY-----",
    FIREWALL_PROTECTED_PATH_PREFIXES: [".github/workflows/", "infra/"],
    FIREWALL_MAX_CHANGED_FILES_WARN: 25,
    FIREWALL_MAX_CHANGED_FILES_BLOCK: 75,
    FIREWALL_MAX_CHANGED_LINES_WARN: 800,
    FIREWALL_MAX_CHANGED_LINES_BLOCK: 2000,
    ALERT_FILE_INSPECTION_FAILURE_THRESHOLD: 5,
    ALERT_FILE_INSPECTION_FAILURE_WINDOW_SECONDS: 300,
  };
}

function signPayload(body: string, secret: string): string {
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  return `sha256=${digest}`;
}

function postJson(port: number, path: string, headers: Record<string, string>, body: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body).toString(),
          ...headers,
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function getText(port: number, path: string): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "GET",
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    req.on("error", reject);
    req.end();
  });
}

async function listenEphemeral(
  server: ReturnType<typeof createHttpServer>,
): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected numeric ephemeral port");
  }

  return (address as AddressInfo).port;
}

async function closeServer(server: ReturnType<typeof createHttpServer>): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

describe("GitHub webhook HTTP integration", () => {
  const serversToClose: Array<ReturnType<typeof createHttpServer>> = [];

  afterEach(async () => {
    await Promise.all(serversToClose.splice(0).map((server) => closeServer(server)));
  });

  it("accepts a valid signed pull_request webhook", async () => {
    const env = createEnv();
    const logger = createLogger({ LOG_LEVEL: "silent", NODE_ENV: "test" });
    const server = createHttpServer(env, logger);
    serversToClose.push(server);

    const port = await listenEphemeral(server);
    const payload = JSON.stringify({
      action: "opened",
      number: 1,
      repository: {
        full_name: "acme/example",
        name: "example",
        owner: { login: "acme" },
      },
      pull_request: {
        html_url: "https://github.com/acme/example/pull/1",
        title: "Integration test webhook",
        body: "Implements webhook integration test. Refs #1.",
        draft: false,
        head: { sha: "abc123" },
        user: { login: "octocat" },
      },
    });

    const response = await postJson(
      port,
      "/webhooks/github",
      {
        "x-github-event": "pull_request",
        "x-github-delivery": randomUUID(),
        "x-hub-signature-256": signPayload(payload, webhookSecret),
      },
      payload,
    );

    expect(response.statusCode).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ message: "Accepted" });
  });

  it("rejects an invalid webhook signature", async () => {
    const env = createEnv();
    const logger = createLogger({ LOG_LEVEL: "silent", NODE_ENV: "test" });
    const server = createHttpServer(env, logger);
    serversToClose.push(server);

    const port = await listenEphemeral(server);
    const payload = JSON.stringify({
      action: "opened",
      number: 2,
      repository: {
        full_name: "acme/example",
        name: "example",
        owner: { login: "acme" },
      },
      pull_request: {
        html_url: "https://github.com/acme/example/pull/2",
        title: "Invalid signature test",
        body: "Refs #2",
        draft: false,
        head: { sha: "def456" },
        user: { login: "octocat" },
      },
    });

    const response = await postJson(
      port,
      "/webhooks/github",
      {
        "x-github-event": "pull_request",
        "x-github-delivery": randomUUID(),
        "x-hub-signature-256": "sha256=invalid",
      },
      payload,
    );

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toEqual({ message: "Invalid webhook signature" });
  });

  it("exposes prometheus metrics", async () => {
    const env = createEnv();
    const logger = createLogger({ LOG_LEVEL: "silent", NODE_ENV: "test" });
    const server = createHttpServer(env, logger);
    serversToClose.push(server);

    const port = await listenEphemeral(server);
    const healthResponse = await getText(port, "/health");
    expect(healthResponse.statusCode).toBe(200);

    const metricsResponse = await getText(port, "/metrics");
    expect(metricsResponse.statusCode).toBe(200);
    expect(metricsResponse.body).toContain("agent_pr_firewall_http_requests_total");
    expect(metricsResponse.body).toContain('path="/health"');
  });
});
