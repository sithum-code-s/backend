import { Router } from "express";
import { verifyToken } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/admin.middleware";
import * as controller from "./admin.controller";

const router = Router();

router.use(verifyToken, requireAdmin);

router.get("/dashboard", controller.getDashboard);

router.get("/merchants", controller.getMerchants);
router.get("/merchants/:id/details", controller.getMerchantDetails);
router.patch("/merchants/:id/verify", controller.verifyMerchant);
router.patch("/merchants/:id/unverify", controller.unverifyMerchant);
router.patch("/deals/:dealId/display-price", controller.updateDealDisplayPrice);

router.get("/users", controller.getUsers);
router.get("/users/:id/details", controller.getUserDetails);
router.patch("/users/:id/suspend", controller.suspendUser);
router.patch("/users/:id/activate", controller.activateUser);

router.get("/deal-requests", controller.getDealRequests);
router.patch("/deal-requests/:id/contacted", controller.contactedDealRequest);
router.patch("/deal-requests/:id/closed", controller.closedDealRequest);

router.delete("/community/posts/:id", controller.deleteCommunityPost);
router.delete("/community/comments/:id", controller.deleteCommunityComment);

export default router;
