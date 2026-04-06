import { Request, Response } from "express";
import * as repo from "./user-preferences.repository";

//////////////////////////////////////////////////////
// POST /user-preferences
//////////////////////////////////////////////////////

export const createPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Check if already exists
    const existing = await repo.findUserPreference(userId);
    if (existing) {
      return res.status(409).json({ message: "Preferences already exist" });
    }

    const preferences = await repo.createUserPreference(userId, req.body);

    return res.json({
      message: "Preferences saved successfully",
      preferences,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to save preferences",
      error: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET /user-preferences
//////////////////////////////////////////////////////

export const getPreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const preferences = await repo.findUserPreference(userId);

    if (!preferences) {
      return res.status(404).json({ message: "No preferences found" });
    }

    return res.json({ preferences });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to fetch preferences",
      error: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// PUT /user-preferences
//////////////////////////////////////////////////////

export const updatePreferences = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const preferences = await repo.updateUserPreference(userId, req.body);

    return res.json({
      message: "Preferences updated successfully",
      preferences,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to update preferences",
      error: error.message,
    });
  }
};
