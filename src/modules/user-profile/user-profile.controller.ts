import { Request, Response } from "express";
import * as service from "./user-profile.service";

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const profile = await service.getUserProfile(userId);
    return res.json({ profile });
  } catch (error: any) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to fetch profile" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const profile = await service.updateUserProfile(userId, req.body);
    return res.json({ message: "Profile updated successfully", profile });
  } catch (error: any) {
    return res.status(error.status || 500).json({ message: error.message || "Failed to update profile" });
  }
};
