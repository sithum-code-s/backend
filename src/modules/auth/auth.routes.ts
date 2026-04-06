import { Router } from "express";
import {
  loginUser,
  registerUser,
  registerMerchant,
  addRole,
  getMe,
  logoutUser,
  refreshToken,
} from "./auth.service";
import { verifyToken } from "../../middleware/auth.middleware";

const router = Router();

//////////////////////////////////////////////////////
// PUBLIC ROUTES (No auth required)
//////////////////////////////////////////////////////

// Login — Frontend sends Supabase access_token
router.post("/login", loginUser);

// Register normal user (traveller)
router.post("/register/user", registerUser);

// Register merchant user
router.post("/register/merchant", registerMerchant);

//////////////////////////////////////////////////////
// PROTECTED ROUTES (Auth required)
//////////////////////////////////////////////////////

// Get current authenticated user with redirect flags
router.get("/me", verifyToken, getMe);

// Add role to existing user (cross-registration)
router.post("/add-role", verifyToken, addRole);

// Logout — clears HTTP-only cookie
router.post("/logout", logoutUser);

// Refresh — accepts new Supabase token, updates cookie
router.post("/refresh", refreshToken);

export default router;