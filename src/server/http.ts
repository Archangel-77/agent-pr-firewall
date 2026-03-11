import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type { AppEnv } from "../config/env.js";
import type { AppLogger } from "../utils/logger.js";
import { createGitHubWebhookHandler } from "../webhooks/handler.js";

const MAX_WEBHOOK_BODY_BYTES = 1_000_000;

class RequestBodyTooLargeError extends Error {
  constructor() {
    super("Request payload exceeded size limit");
    this.name = "RequestBodyTooLargeError";
  }
}

function sendJsonResponse(res: ServerResponse, statusCode: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body).toString(),
  });
  res.end(body);
}

async function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let bytesRead = 0;
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer | string) => {
      const buffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      bytesRead += buffer.length;

      if (bytesRead > MAX_WEBHOOK_BODY_BYTES) {
        reject(new RequestBodyTooLargeError());
        req.destroy();
        return;
      }

      chunks.push(buffer);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

export function createHttpServer(env: AppEnv, logger: AppLogger) {
  const processGitHubWebhook = createGitHubWebhookHandler(env, logger);

  return createServer(async (req, res) => {
    if (!req.url || !req.method) {
      sendJsonResponse(res, 400, { error: "Invalid request" });
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      sendJsonResponse(res, 200, { status: "ok" });
      return;
    }

    if (req.method === "POST" && req.url === "/webhooks/github") {
      try {
        const rawBody = await readRawBody(req);
        const result = await processGitHubWebhook(req.headers, rawBody);
        sendJsonResponse(res, result.statusCode, { message: result.message });
      } catch (error) {
        if (error instanceof RequestBodyTooLargeError) {
          sendJsonResponse(res, 413, { error: error.message });
          return;
        }

        logger.error({ err: error }, "Failed to process GitHub webhook request");
        sendJsonResponse(res, 500, { error: "Internal server error" });
      }

      return;
    }

    sendJsonResponse(res, 404, { error: "Not found" });
  });
}
