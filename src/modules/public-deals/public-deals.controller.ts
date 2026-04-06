import { Request, Response } from "express";
import { z } from "zod";
import * as service from "./public-deals.service";
import { lockDealSchema, createBookingSchema, paginationSchema, publicDealsQuerySchema } from "./public-deals.dtos";

// ─── Public Deal Endpoints (no auth required) ───

export const getActiveDeals = async (req: Request, res: Response) => {
  try {
    const query = publicDealsQuerySchema.parse(req.query);

    // Ensure we release any expired locks before listing to show accurate availability
    await service.releaseExpiredLocks();

    const result = await service.getActiveDeals(query);

    return res.json({
      data: result.data,
      total: result.total,
      page: query.page,
      limit: query.limit,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ errors: err.flatten().fieldErrors });
    }
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

export const getDealDetail = async (req: Request, res: Response) => {
  try {
    await service.releaseExpiredLocks();
    const deal = await service.getDealDetail(req.params.id as string);
    return res.json(deal);
  } catch (err: any) {
    if (err.message === "Deal not found") {
      return res.status(404).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
};

// ─── Lock Endpoints (auth required) ───

export const lockDeal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const parsed = lockDealSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const lock = await service.lockDeal(userId, parsed.data);
    return res.status(201).json(lock);
  } catch (err: any) {
    if (err.code === "SUSPENDED_ACCOUNT") {
      return res.status(403).json({ message: err.message, code: err.code });
    }
    if (err.code === "DAILY_LOCK_LIMIT_EXCEEDED") {
      return res.status(429).json({ message: err.message, code: err.code });
    }
    if (err.message.includes("not found")) {
      return res.status(404).json({ message: err.message, code: err.code });
    }
    if (err.message.includes("slots available") || err.message.includes("not available") || err.message.includes("past variant")) {
      return res.status(400).json({ message: err.message });
    }
    console.error("lockDeal error:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

export const getMyLocks = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { page, limit } = paginationSchema.parse(req.query);
    const result = await service.getMyLocks(userId, { page, limit });

    return res.json({
      data: result.data,
      total: result.total,
      page,
      limit,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

// ─── Booking Endpoints (auth required) ───

export const createBooking = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }

    const booking = await service.createBooking(userId, parsed.data);
    return res.status(201).json(booking);
  } catch (err: any) {
    if (err.code === "SUSPENDED_ACCOUNT") {
      return res.status(403).json({ message: err.message, code: err.code });
    }
    if (err.message.includes("not found")) {
      return res.status(404).json({ message: err.message, code: err.code });
    }
    if (err.message.includes("Unauthorized") || err.message.includes("expired") || err.message.includes("no longer active")) {
      return res.status(400).json({ message: err.message });
    }
    console.error("createBooking error:", err);
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};

export const getMyBookings = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { page, limit } = paginationSchema.parse(req.query);
    const result = await service.getMyBookings(userId, { page, limit });

    return res.json({
      data: result.data,
      total: result.total,
      page,
      limit,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const getPlatformStats = async (req: Request, res: Response) => {
  try {
    const stats = await service.getPlatformStats();
    return res.json(stats);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Internal server error" });
  }
};
