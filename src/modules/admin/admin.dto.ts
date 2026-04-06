import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
});

export const dateRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const merchantListQuerySchema = paginationSchema.extend({
  verificationStatus: z.enum(["pending", "verified"]).optional(),
  search: z.string().optional(),
}).merge(dateRangeSchema);

export const merchantIdSchema = z.object({
  id: z.string().uuid(),
});

export const userListQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
}).merge(dateRangeSchema);

export const userIdSchema = z.object({
  id: z.string().uuid(),
});

export const dealRequestListQuerySchema = paginationSchema.extend({
  status: z.enum(["new", "contacted", "closed"]).optional(),
  search: z.string().optional(),
}).merge(dateRangeSchema);

export const dealIdParamsSchema = z.object({
  dealId: z.string().uuid(),
});

export const displayPriceSchema = z.object({
  displayedPrice: z.number().min(0),
});

export const publicDealRequestSchema = z.object({
  message: z.string().min(10, "Please describe your request"),
  contactNumber: z.string().min(7, "Contact number is required"),
});

export type PaginationDto = z.infer<typeof paginationSchema>;
export type MerchantListQueryDto = z.infer<typeof merchantListQuerySchema>;
export type UserListQueryDto = z.infer<typeof userListQuerySchema>;
export type DealRequestListQueryDto = z.infer<typeof dealRequestListQuerySchema>;
export type DisplayPriceDto = z.infer<typeof displayPriceSchema>;
export type PublicDealRequestDto = z.infer<typeof publicDealRequestSchema>;
