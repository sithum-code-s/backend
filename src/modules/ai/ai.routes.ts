import { Router, Request, Response } from "express";
import { verifyToken } from "../../middleware/auth.middleware";
import { requireMerchant } from "../../middleware/merchant.middleware";
import { generateItinerarySchema, generateAddOnsSchema } from "./ai.dtos";
import { generateItineraryAI } from "./ai.itinerary.service";
import { generateAddOnsAI } from "./ai.addons.service";

const router = Router();

router.post(
  "/generate-itinerary",
  verifyToken,
  requireMerchant,
  async (req: Request, res: Response) => {
    try {
      const parsed = generateItinerarySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const data = await generateItineraryAI(parsed.data);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({
        message: error?.message || "Failed to generate itinerary",
      });
    }
  }
);

router.post(
  "/generate-add-ons",
  verifyToken,
  requireMerchant,
  async (req: Request, res: Response) => {
    try {
      const parsed = generateAddOnsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          errors: parsed.error.flatten().fieldErrors,
        });
      }

      const data = await generateAddOnsAI(parsed.data);
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({
        message: error?.message || "Failed to generate add-ons",
      });
    }
  }
);

export default router;
