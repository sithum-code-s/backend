import { Request, Response } from "express";
import * as dealsService from "./deals.service";
import * as publicDealsService from "../public-deals/public-deals.service";
import {
  createDealSchema,
  updateDealSchema,
  createVariantSchema,
  updateVariantSchema,
  bulkCancelSchema,
  bulkUpdatePriceSchema,
  bulkUpdateSlotsSchema,
  createRecurringRuleSchema,
} from "./deals.dtos";

// ────────────────────────────────────────────
// DEAL ENDPOINTS
// ────────────────────────────────────────────

export const createDeal = async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantProfileId;
    if (!merchantId) {
      return res.status(403).json({ message: "Merchant profile required" });
    }

    const parsed = createDealSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const deal = await dealsService.createDeal(merchantId, parsed.data);
    return res.status(201).json(deal);
  } catch (err: any) {
    console.error("createDeal error:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

export const getDeal = async (req: Request, res: Response) => {
  try {
    const deal = await dealsService.getDealById(req.params.id as string);
    return res.json(deal);
  } catch (err: any) {
    if (err.message === "Deal not found") return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
};

export const getMyDeals = async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantProfileId;
    if (!merchantId) {
      return res.status(403).json({ message: "Merchant profile required" });
    }

    const deals = await dealsService.getDealsByMerchant(merchantId);
    return res.json(deals);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const getDealAnalytics = async (req: Request, res: Response) => {
  try {
    const dealId = req.params.id as string;
    const merchantId = (req as any).merchantProfileId;
    const { startDate, endDate } = req.query;

    const analytics = await dealsService.getDealAnalytics(
      dealId,
      merchantId,
      startDate as string,
      endDate as string
    );

    return res.json(analytics);
  } catch (err: any) {
    if (err.message === "Deal not found") return res.status(404).json({ message: err.message });
    if (err.message.includes("Unauthorized")) return res.status(403).json({ message: err.message });
    if (err.message.includes("Cannot edit displayed price")) return res.status(400).json({ message: err.message });
    if (err.message.includes("Cannot edit deal details")) return res.status(400).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
};

export const getMerchantOverallAnalytics = async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantProfileId;
    if (!merchantId) {
      return res.status(403).json({ message: "Merchant profile required" });
    }

    const { startDate, endDate } = req.query;

    const analytics = await dealsService.getMerchantOverallAnalytics(
      merchantId,
      startDate as string,
      endDate as string
    );

    return res.json(analytics);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateDeal = async (req: Request, res: Response) => {
  try {
    const parsed = updateDealSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const merchantId = (req as any).merchantProfileId;
    const deal = await dealsService.updateDeal(req.params.id as string, merchantId, parsed.data);
    return res.json(deal);
  } catch (err: any) {
    if (err.message === "Deal not found") return res.status(404).json({ message: err.message });
    if (err.message.includes("Unauthorized")) return res.status(403).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────
// VARIANT ENDPOINTS
// ────────────────────────────────────────────

export const createVariant = async (req: Request, res: Response) => {
  try {
    const parsed = createVariantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const merchantId = (req as any).merchantProfileId;
    const variant = await dealsService.createVariant(merchantId, parsed.data);
    return res.status(201).json(variant);
  } catch (err: any) {
    if (err.message.includes("already exists")) {
      return res.status(409).json({ message: err.message });
    }
    if (err.message.includes("Unauthorized")) return res.status(403).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
};

export const getVariantsByDeal = async (req: Request, res: Response) => {
  try {
    const dealId = req.params.dealId as string;
    const { status, startDate, endDate } = req.query;

    await publicDealsService.releaseExpiredLocks();

    const variants = await dealsService.getVariantsByDeal({
      dealId,
      status: status as any,
      startDate: startDate as string,
      endDate: endDate as string,
    });

    return res.json(variants);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const checkVariantAvailability = async (req: Request, res: Response) => {
  try {
    const { dealId, startDate, endDate } = req.body;
    if (!dealId || !startDate || !endDate) {
      return res.status(400).json({ message: "dealId, startDate and endDate are required" });
    }

    const conflictingDates = await dealsService.checkVariantAvailability(dealId, startDate, endDate);
    return res.json({ conflictingDates });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const getVariant = async (req: Request, res: Response) => {
  try {
    const variant = await dealsService.getVariantById(req.params.id as string);
    return res.json(variant);
  } catch (err: any) {
    if (err.message === "Variant not found") return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
};

export const updateVariant = async (req: Request, res: Response) => {
  try {
    const parsed = updateVariantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const merchantId = (req as any).merchantProfileId;
    const variant = await dealsService.updateVariant(req.params.id as string, merchantId, parsed.data);
    return res.json(variant);
  } catch (err: any) {
    if (err.message === "Variant not found") return res.status(404).json({ message: err.message });
    if (err.message.includes("Unauthorized")) return res.status(403).json({ message: err.message });
    if (err.message.includes("Cannot update") || err.message.includes("active")) return res.status(400).json({ message: err.message });
    console.error("updateVariant error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const cancelVariant = async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantProfileId;
    const variant = await dealsService.cancelVariant(req.params.id as string, merchantId);
    return res.json(variant);
  } catch (err: any) {
    if (err.message === "Variant not found") return res.status(404).json({ message: err.message });
    if (err.message.includes("Unauthorized")) return res.status(403).json({ message: err.message });
    if (err.message.includes("Cannot cancel")) return res.status(400).json({ message: err.message });
    console.error("cancelVariant error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const cancelSlot = async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantProfileId;
    const slot = await dealsService.cancelSlot(req.params.id as string, merchantId);
    return res.json(slot);
  } catch (err: any) {
    if (err.message === "Slot not found") return res.status(404).json({ message: err.message });
    if (err.message.includes("Unauthorized")) return res.status(403).json({ message: err.message });
    if (err.message.includes("Cannot cancel")) return res.status(400).json({ message: err.message });
    console.error("cancelSlot error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const restoreSlot = async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantProfileId;
    const slot = await dealsService.restoreSlot(req.params.id as string, merchantId);
    return res.json(slot);
  } catch (err: any) {
    if (err.message === "Slot not found") return res.status(404).json({ message: err.message });
    if (err.message.includes("Unauthorized")) return res.status(403).json({ message: err.message });
    if (err.message.includes("Cannot restore")) return res.status(400).json({ message: err.message });
    console.error("restoreSlot error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteVariant = async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).merchantProfileId;
    await dealsService.deleteVariant(req.params.id as string, merchantId);
    return res.status(204).send();
  } catch (err: any) {
    if (err.message === "Variant not found") return res.status(404).json({ message: err.message });
    if (err.message.includes("Unauthorized")) return res.status(403).json({ message: err.message });
    if (err.message.includes("Cannot delete")) return res.status(400).json({ message: err.message });
    console.error("deleteVariant error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getVariantBookings = async (req: Request, res: Response) => {
  try {
    const bookings = await dealsService.getVariantBookings(req.params.id as string);
    return res.json(bookings);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────
// BULK OPERATIONS
// ────────────────────────────────────────────

export const bulkCancel = async (req: Request, res: Response) => {
  try {
    const parsed = bulkCancelSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const result = await dealsService.bulkCancelVariants(parsed.data.variantIds);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const bulkUpdatePrice = async (req: Request, res: Response) => {
  try {
    const parsed = bulkUpdatePriceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const result = await dealsService.bulkUpdatePrice(
      parsed.data.variantIds,
      parsed.data.dealPrice
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const bulkUpdateSlots = async (req: Request, res: Response) => {
  try {
    const parsed = bulkUpdateSlotsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const result = await dealsService.bulkUpdateSlots(
      parsed.data.variantIds,
      parsed.data.totalSlots
    );
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────
// RECURRING RULES
// ────────────────────────────────────────────

export const createRecurringRule = async (req: Request, res: Response) => {
  try {
    const parsed = createRecurringRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const merchantId = (req as any).merchantProfileId;
    const result = await dealsService.createRecurringRule(merchantId, parsed.data);
    return res.status(201).json(result);
  } catch (err: any) {
    if (err.message.includes("Unauthorized")) return res.status(403).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
};

export const previewRecurringDates = async (req: Request, res: Response) => {
  try {
    const parsed = createRecurringRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const dates = dealsService.previewRecurringDates(parsed.data);
    return res.json({ dates, count: dates.length });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const getRecurringRules = async (req: Request, res: Response) => {
  try {
    const rules = await dealsService.getRecurringRulesByDeal(req.params.dealId as string);
    return res.json(rules);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
