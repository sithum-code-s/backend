import { Request, Response, NextFunction } from "express";
import { getDbUser } from "./auth.helpers";

/**
 * Middleware that ensures the authenticated user has traveller role.
 * Used for endpoints that require user to be a traveller (like locking/booking deals).
 * Returns 403 Forbidden if user is not a traveller.
 */
export const requireTraveller = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        message: "Authentication required",
        code: "NOT_AUTHENTICATED",
      });
    }

    const user = await getDbUser(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    if (!user.isTraveller) {
      return res.status(403).json({
        message: "You must be a traveller to perform this action. Please register as a user first.",
        code: "NOT_TRAVELLER",
        requireAction: "REGISTER_AS_TRAVELLER",
      });
    }

    next();
  } catch (err) {
    console.error("requireTraveller error:", err);
    res.status(500).json({
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  }
};
