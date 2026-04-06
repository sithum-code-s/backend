import { Request, Response } from "express";
import * as service from "./merchant-profile.service";

export const createProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const profile = await service.createMerchantProfile(userId, req.body);
    return res.json({ message: "Merchant profile created successfully", profile });
  } catch (error: any) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to create merchant profile" });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const profile = await service.getMerchantProfile(userId);
    return res.json({ profile });
  } catch (error: any) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to fetch merchant profile" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const profile = await service.updateMerchantProfile(userId, req.body);
    return res.json({ message: "Merchant profile updated successfully", profile });
  } catch (error: any) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to update merchant profile" });
  }
};
