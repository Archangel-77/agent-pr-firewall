import { loadEnv } from "./config/env.js";
import { createHttpServer } from "./server/http.js";
import { createLogger } from "./utils/logger.js";

const env = loadEnv();
const logger = createLogger(env);
const server = createHttpServer(env, logger);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Agent PR firewall server started");
});

function shutdown(signal: NodeJS.Signals): void {
  logger.info({ signal }, "Shutdown requested");

  server.close((error) => {
    if (error) {
      logger.error({ err: error }, "Error while closing HTTP server");
      process.exitCode = 1;
    }

    process.exit();
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
