import pino from "pino";

import type { AppEnv } from "../config/env.js";

export function createLogger(
  env: Pick<AppEnv, "LOG_LEVEL" | "NODE_ENV"> & { LOG_FILE_PATH?: string },
) {
  const destination =
    env.LOG_FILE_PATH && env.LOG_FILE_PATH.trim().length > 0
      ? pino.destination({ dest: env.LOG_FILE_PATH, sync: false })
      : undefined;

  return pino(
    {
    level: env.LOG_LEVEL,
    base: {
      service: "agent-pr-firewall",
      env: env.NODE_ENV,
    },
    redact: {
      paths: ["req.headers.authorization", "headers.authorization"],
      censor: "[Redacted]",
    },
    },
    destination,
  );
}

export type AppLogger = ReturnType<typeof createLogger>;
