import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { KontrolController } from "./kontrol.controller.js";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/v1/kontrol
 * Status node kontrol terakhir yang dibaca firmware.
 */
router.get("/", (req, res, next) => {
  KontrolController.getState(req, res).catch(next);
});

/**
 * POST /api/v1/kontrol
 * Kirim perintah manual: mode | siram | on | off | reset.
 */
router.post("/", (req, res, next) => {
  KontrolController.send(req, res).catch(next);
});

export default router;
