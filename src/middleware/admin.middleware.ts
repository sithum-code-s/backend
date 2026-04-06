import { Request, Response, NextFunction } from "express";
import { getDbUser } from "./auth.helpers";

export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await getDbUser(req);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }

    req.user = {
      id: user.id,
      email: user.email,
    };
    req.userId = user.id;

    next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Admin authorization failed" });
  }
};
