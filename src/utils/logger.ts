import pino from "pino";

import type { AppEnv } from "../config/env.js";

export function createLogger(env: Pick<AppEnv, "LOG_LEVEL" | "NODE_ENV">) {
  return pino({
    level: env.LOG_LEVEL,
    base: {
      service: "agent-pr-firewall",
      env: env.NODE_ENV,
    },
    redact: {
      paths: ["req.headers.authorization", "headers.authorization"],
      censor: "[Redacted]",
    },
  });
}

export type AppLogger = ReturnType<typeof createLogger>;
