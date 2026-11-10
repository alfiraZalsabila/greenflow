import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { logger } from "./lib/logger.js";
import { csrfProtection } from "./middleware/csrf.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { requestId } from "./middleware/request-id.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { profileRouter } from "./modules/profile/profile.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import lahanRouter from "./modules/lahan/lahan.routes.js";
import devicesRouter from "./modules/devices/devices.routes.js";
import readingsRouter from "./modules/readings/readings.routes.js";
import wateringsRouter from "./modules/waterings/waterings.routes.js";
import parameterRouter from "./modules/parameter/parameter.routes.js";
import kalibrasiRouter from "./modules/kalibrasi/kalibrasi.routes.js";
import notifikasiRouter from "./modules/notifikasi/notifikasi.routes.js";
import laporanRouter from "./modules/laporan/laporan.routes.js";
import telemetryRouter from "./modules/telemetry/telemetry.routes.js";
import realtimeRouter from "./modules/realtime/realtime.routes.js";
import kontrolRouter from "./modules/kontrol/kontrol.routes.js";
import { healthHandler } from "./routes/health.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(requestId);
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(express.json({ limit: "100kb", type: "application/json" }));
app.use(cookieParser());

app.get("/healthz", healthHandler);
app.get("/api/v1/healthz", healthHandler);

app.use("/api/v1/auth", csrfProtection, authRouter);
app.use("/api/v1/me", csrfProtection, profileRouter);
app.use("/api/v1/users", csrfProtection, usersRouter);
app.use("/api/v1/lahan", csrfProtection, lahanRouter);
app.use("/api/v1/devices", csrfProtection, devicesRouter);
app.use("/api/v1/readings", csrfProtection, readingsRouter);
app.use("/api/v1/waterings", csrfProtection, wateringsRouter);
app.use("/api/v1/parameter", csrfProtection, parameterRouter);
app.use("/api/v1/kalibrasi", csrfProtection, kalibrasiRouter);
app.use("/api/v1/notifikasi", csrfProtection, notifikasiRouter);
app.use("/api/v1/laporan", csrfProtection, laporanRouter);
app.use("/api/v1/telemetry", telemetryRouter);
app.use("/api/v1/realtime", realtimeRouter);
app.use("/api/v1/kontrol", csrfProtection, kontrolRouter);

app.use(notFound);
app.use(errorHandler);
