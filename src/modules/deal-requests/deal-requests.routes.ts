import { Router } from "express";
import { optionalAuth } from "../../middleware/auth.middleware";
import * as controller from "./deal-requests.controller";

const router = Router();

router.post("/", optionalAuth, controller.submitDealRequest);

export default router;
