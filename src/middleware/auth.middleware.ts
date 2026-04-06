import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { extractToken } from "./auth.helpers";


export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = {
      id: data.user.id,
      email: data.user.email ?? undefined,
    };
    req.userId = data.user.id;

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = extractToken(req);

    if (!token) {
      req.user = null;
      req.userId = null;
      return next();
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      req.user = null;
      req.userId = null;
    } else {
      req.user = {
        id: data.user.id,
        email: data.user.email ?? undefined,
      };
      req.userId = data.user.id;
    }

    next();
  } catch {
    req.user = null;
    req.userId = null;
    next();
  }
};