import { createServer, type IncomingMessage, type ServerResponse } from "node:http";

import type { AppEnv } from "../config/env.js";
import { FileInspectionAlertMonitor } from "../observability/file-inspection-alert.js";
import { MetricsRegistry } from "../observability/metrics.js";
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

function sendTextResponse(
  res: ServerResponse,
  statusCode: number,
  data: string,
  contentType: string,
): void {
  res.writeHead(statusCode, {
    "content-type": contentType,
    "content-length": Buffer.byteLength(data).toString(),
  });
  res.end(data);
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
  const metrics = new MetricsRegistry();
  const fileInspectionAlertMonitor = new FileInspectionAlertMonitor({
    threshold: env.ALERT_FILE_INSPECTION_FAILURE_THRESHOLD,
    windowMs: env.ALERT_FILE_INSPECTION_FAILURE_WINDOW_SECONDS * 1000,
  });

  const processGitHubWebhook = createGitHubWebhookHandler(env, logger, {
    metrics,
    fileInspectionAlertMonitor,
  });

  return createServer(async (req, res) => {
    const method = req.method ?? "UNKNOWN";
    const routePath = req.url?.split("?")[0] ?? "unknown";

    const respondJson = (statusCode: number, data: unknown): void => {
      metrics.incrementHttpRequest(method, routePath, statusCode);
      sendJsonResponse(res, statusCode, data);
    };

    const respondText = (statusCode: number, body: string, contentType: string): void => {
      metrics.incrementHttpRequest(method, routePath, statusCode);
      sendTextResponse(res, statusCode, body, contentType);
    };

    if (!req.url || !req.method) {
      respondJson(400, { error: "Invalid request" });
      return;
    }

    if (req.method === "GET" && routePath === "/health") {
      respondJson(200, { status: "ok" });
      return;
    }

    if (req.method === "GET" && routePath === "/metrics") {
      respondText(
        200,
        metrics.renderPrometheus(),
        "text/plain; version=0.0.4; charset=utf-8",
      );
      return;
    }

    if (req.method === "POST" && routePath === "/webhooks/github") {
      try {
        const rawBody = await readRawBody(req);
        const result = await processGitHubWebhook(req.headers, rawBody);
        respondJson(result.statusCode, { message: result.message });
      } catch (error) {
        if (error instanceof RequestBodyTooLargeError) {
          respondJson(413, { error: error.message });
          return;
        }

        logger.error({ err: error }, "Failed to process GitHub webhook request");
        respondJson(500, { error: "Internal server error" });
      }

      return;
    }

    respondJson(404, { error: "Not found" });
  });
}
