import { Router } from "express";
import * as controller from "./merchant-profile.controller";
import { verifyToken } from "../../middleware/auth.middleware";

const router = Router();

// All merchant-profile routes require authentication
router.post("/", verifyToken, controller.createProfile);
router.get("/", verifyToken, controller.getProfile);
router.patch("/", verifyToken, controller.updateProfile);

export default router;
