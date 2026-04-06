import { Router } from "express";
import { createPreferences, getPreferences, updatePreferences } from "./user-preferences.service";
import { verifyToken } from "../../middleware/auth.middleware";

const router = Router();

// All user-preferences routes require authentication
router.post("/", verifyToken, createPreferences);
router.get("/", verifyToken, getPreferences);
router.put("/", verifyToken, updatePreferences);

export default router;
