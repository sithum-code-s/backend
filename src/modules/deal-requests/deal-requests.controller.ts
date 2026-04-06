import { Request, Response } from "express";
import { createDealRequestSchema } from "./deal-requests.dto";
import { createDealRequest } from "../admin/admin.service";

export const submitDealRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const parsed = createDealRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const data = await createDealRequest(userId, parsed.data);
    return res.status(201).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to submit deal request" });
  }
};
