import { z } from "zod";
import { DealCategory } from "../deals/deals.types";

export const lockDealSchema = z.object({
  variantId: z.string().uuid("Invalid variant ID"),
  quantity: z.number().int().min(1, "At least 1 slot required").max(20, "Maximum 20 slots"),
});

export const createBookingSchema = z.object({
  lockId: z.string().uuid("Invalid lock ID"),
  paymentStatus: z.enum(["pending", "paid", "failed"]).optional(),
});

export const paginationSchema = z.object({
  page: z.preprocess((val) => Number(val), z.number().int().min(1)).default(1),
  limit: z.preprocess((val) => Number(val), z.number().int().min(1).max(100)).default(10),
});

export const publicDealsQuerySchema = z.object({
  page: z.preprocess((val) => Number(val), z.number().int().min(1)).default(1),
  limit: z.preprocess((val) => Number(val), z.number().int().min(1).max(100)).default(10),
  location: z.string().optional(),
  category: z.nativeEnum(DealCategory).or(z.string()).optional(),
  minPrice: z.preprocess((val) => Number(val), z.number().min(0)).optional(),
  maxPrice: z.preprocess((val) => Number(val), z.number().min(0)).optional(),
  search: z.string().optional(),
});

export type PublicDealsQueryDto = z.infer<typeof publicDealsQuerySchema>;
export type PaginationDto = z.infer<typeof paginationSchema>;
export type LockDealDto = z.infer<typeof lockDealSchema>;
export type CreateBookingDto = z.infer<typeof createBookingSchema>;
