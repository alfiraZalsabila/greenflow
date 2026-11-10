import { createServer } from "node:http";

import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { startUserCache } from "./modules/users/user-cache.js";
import { ensureDefaultUsers } from "./lib/auto-seed.js";

const server = createServer(app);

server.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    "GREENFLOW API berjalan",
  );
  ensureDefaultUsers().catch((error: unknown) => {
    logger.error({ err: error }, "auto-seed gagal");
  });
});

startUserCache().catch((error: unknown) => {
  logger.error({ err: error }, "cache pengguna belum siap; fallback baca langsung");
});

let shuttingDown = false;

const shutdown = (signal: NodeJS.Signals) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, "menghentikan server");

  server.close((err) => {
    if (err) {
      logger.error({ err }, "gagal menghentikan server");
      process.exit(1);
    }
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("penghentian melewati batas waktu, keluar paksa");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
