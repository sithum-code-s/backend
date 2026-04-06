import { Router } from "express";
import { verifyToken } from "../../middleware/auth.middleware";
import { requireMerchant } from "../../middleware/merchant.middleware";
import * as controller from "./deals.controller";

const router = Router();

// All deal routes require a valid auth token and an active merchant profile.
router.use(verifyToken, requireMerchant);

// ─── DEAL ROUTES ───
// Create a new deal for the authenticated merchant.
router.post("/", controller.createDeal);
// Return all active deals owned by the current merchant.
router.get("/my-deals", controller.getMyDeals);
// Return overall merchant analytics for the deal dashboard.
router.get("/merchant/analytics", controller.getMerchantOverallAnalytics);
// Return a single deal by its id, including related details.
router.get("/:id", controller.getDeal);
// Return analytics for one deal within an optional date range.
router.get("/:id/analytics", controller.getDealAnalytics);
// Update the core details of an existing deal.
router.put("/:id", controller.updateDeal);

// ─── VARIANT ROUTES ───
// Create a new availability variant for a deal.
router.post("/variants", controller.createVariant);
// List all variants for a deal.
router.get("/:dealId/variants", controller.getVariantsByDeal);
// Return one variant by id with its slots and related data.
router.get("/variants/:id", controller.getVariant);
// Update an existing variant's fields such as slots or price.
router.patch("/variants/:id", controller.updateVariant);
// Cancel an entire variant day.
router.patch("/variants/:id/cancel", controller.cancelVariant);
// Cancel a single slot inside a variant.
router.patch("/variants/slots/:id/cancel", controller.cancelSlot);
// Restore a cancelled slot back to available.
router.patch("/variants/slots/:id/restore", controller.restoreSlot);
// Check for conflicting variant dates before creating availability.
router.post("/variants/check-availability", controller.checkVariantAvailability);
// Delete a variant when it has no active bookings or locks.
router.delete("/variants/:id", controller.deleteVariant);
// Return the booking summaries attached to a variant.
router.get("/variants/:id/bookings", controller.getVariantBookings);

// ─── BULK VARIANT OPERATIONS ───
// Cancel multiple variants in one request.
router.post("/variants/bulk-cancel", controller.bulkCancel);
// Update the price for multiple variants in one request.
router.post("/variants/bulk-update-price", controller.bulkUpdatePrice);
// Update the total slots for multiple variants in one request.
router.post("/variants/bulk-update-slots", controller.bulkUpdateSlots);

// ─── RECURRING RULES ───
// Create a recurring rule to generate variants on a schedule.
router.post("/recurring-rules", controller.createRecurringRule);
// Preview the dates a recurring rule would generate.
router.post("/recurring-rules/preview", controller.previewRecurringDates);
// Return all recurring rules configured for a deal.
router.get("/:dealId/recurring-rules", controller.getRecurringRules);

export default router;
