import { randomUUID } from "node:crypto";

import type { RequestHandler } from "express";

declare module "express-serve-static-core" {
  interface Request {
    requestId?: string;
  }
}

export const requestId: RequestHandler = (req, res, next) => {
  const id = req.get("x-request-id")?.slice(0, 100) || randomUUID();
  req.requestId = id;
  res.setHeader("X-Request-Id", id);
  next();
};
