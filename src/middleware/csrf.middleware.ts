import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Public paths exempt from CSRF protection (unauthenticated endpoints)
// Refresh is exempt so the browser can bootstrap its session before it has a CSRF token.
const CSRF_EXEMPT_PATHS = [
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/register/user",
  "/api/auth/register/merchant",
];

function getRequestPath(req: Request) {
  return req.originalUrl.split("?")[0];
}

// Simple CSRF protection using double-submit cookie pattern
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for exempt public routes
  if (CSRF_EXEMPT_PATHS.includes(getRequestPath(req))) {
    return next();
  }

  // Mobile clients use Authorization bearer tokens (not browser cookies),
  // so CSRF protection is not required for those authenticated requests.
  const authHeader = req.headers["authorization"];
  const hasBearerToken =
    typeof authHeader === "string" && authHeader.startsWith("Bearer ");
  if (hasBearerToken) {
    return next();
  }

  const csrfCookie = req.cookies["csrf_token"];
  const csrfHeader = req.headers["x-csrf-token"];

  // Only check for state-changing requests
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return res.status(403).json({ message: "Invalid CSRF token" });
    }
  }
  next();
}

// Middleware to set CSRF token cookie if not present
export function setCsrfCookie(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies["csrf_token"]) {
    const token = crypto.randomBytes(32).toString("hex");
    res.cookie("csrf_token", token, {
      httpOnly: false, // must be readable by JS
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });
  }
  next();
}
