import { Router } from "express";
import { verifyToken } from "../../middleware/auth.middleware";
import { requireTraveller } from "../../middleware/traveller.middleware";
import * as controller from "./public-deals.controller";

const router = Router();

// ─── Public routes (no auth required) ───
router.get("/platform-stats", controller.getPlatformStats);
router.get("/", controller.getActiveDeals);
router.get("/:id", controller.getDealDetail);

// ─── Authenticated routes (user auth, NO merchant required) ───
router.post("/lock", verifyToken, requireTraveller, controller.lockDeal);
router.get("/user/my-locks", verifyToken, controller.getMyLocks);
router.post("/book", verifyToken, requireTraveller, controller.createBooking);
router.get("/user/my-bookings", verifyToken, controller.getMyBookings);

export default router;
