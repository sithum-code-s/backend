import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma";
import { getDbUser } from "./auth.helpers";

/**
 * Middleware that verifies merchant access and resolves the merchant profile ID.
 * Supports both merchant-only and merchant+traveller users.
 */
export const requireMerchant = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const dbUser = await getDbUser(req);
    if (!dbUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!dbUser.isMerchant) {
      return res.status(403).json({
        message: "Merchant role required",
        code: "NOT_MERCHANT",
        requireAction: "REGISTER_AS_MERCHANT",
      });
    }

    if (req.merchantProfileId) {
      return next();
    }

    const profile = await prisma.merchantProfile.findUnique({
      where: { userId: dbUser.id },
      select: { id: true },
    });

    if (!profile) {
      return res.status(403).json({ message: "No merchant profile found" });
    }

    req.merchantProfileId = profile.id;
    next();
  } catch (err) {
    console.error("requireMerchant error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Backward-compatible export while routes migrate to requireMerchant.
export const resolveMerchant = requireMerchant;
