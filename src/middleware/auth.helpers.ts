import type { Request } from "express";
import { prisma } from "../config/prisma";

export const extractToken = (req: Request): string | null => {
  const cookieToken = req.cookies?.access_token;
  if (typeof cookieToken === "string" && cookieToken.trim().length > 0) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7).trim();
    return bearerToken.length > 0 ? bearerToken : null;
  }

  return null;
};

export const getDbUser = async (req: Request) => {
  if (req.dbUser !== undefined) {
    return req.dbUser;
  }

  const authUserId = req.user?.id;
  if (!authUserId) {
    req.dbUser = null;
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: authUserId },
    select: {
      id: true,
      email: true,
      isAdmin: true,
      isTraveller: true,
      isMerchant: true,
      status: true,
    },
  });

  req.dbUser = user;
  return user;
};