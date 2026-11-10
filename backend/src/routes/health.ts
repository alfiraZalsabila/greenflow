import type { RequestHandler } from "express";

export const healthHandler: RequestHandler = (_req, res) => {
  res.status(200).json({
    ok: true,
    service: "greenflow-api",
    time: new Date().toISOString(),
    uptimeSec: Math.round(process.uptime()),
  });
};
