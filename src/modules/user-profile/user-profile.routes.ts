import { Router } from "express";
import * as controller from "./user-profile.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const router = Router();

router.get("/", verifyToken, controller.getProfile);
router.patch("/", verifyToken, controller.updateProfile);

export default router;
