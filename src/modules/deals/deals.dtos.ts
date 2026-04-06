import { z } from "zod";

// ─── Itinerary / Inclusion / Exclusion ───

const itinerarySchema = z.object({
  dayNumber: z.number().int().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

const inclusionSchema = z.object({
  description: z.string().min(1),
});

const exclusionSchema = z.object({
  description: z.string().min(1),
  additionalPrice: z.number().optional(),
});

// ─── Deal Schemas ───

const dealValidationRefinement = (data: any) => {
  // If both durationDays and itineraries are provided, they must match
  if (data.durationDays !== undefined && data.itineraries && data.itineraries.length > 0) {
    if (data.durationDays !== data.itineraries.length) {
      return false;
    }
  }
  return true;
};

const baseDealObject = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
  durationType: z.string().optional(),
  durationDays: z.number().int().min(0).optional(),
  durationHours: z.number().int().min(0).optional(),
  dealPrice: z.number().min(0).optional(),
  originalPrice: z.number().min(0).optional(),
  displayedPrice: z.number().min(0).optional(),
  primaryImageUrl: z.string().url().optional(),
  secondImageUrl: z.string().url().optional(),
  thirdImageUrl: z.string().url().optional(),
  fourthImageUrl: z.string().url().optional(),
  dealLockExpireTime: z.number().int().optional(),
  itineraries: z.array(itinerarySchema).optional(),
  inclusions: z.array(inclusionSchema).optional(),
  exclusions: z.array(exclusionSchema).optional(),
});

export const createDealSchema = baseDealObject.refine(
  dealValidationRefinement,
  {
    message: "Duration days must match the number of itinerary days",
    path: ["durationDays"],
  }
);

export const updateDealSchema = baseDealObject.partial().refine(
  dealValidationRefinement,
  {
    message: "Duration days must match the number of itinerary days",
    path: ["durationDays"],
  }
);

// ─── Variant Schemas ───

export const createVariantSchema = z.object({
  dealId: z.string().uuid(),
  title: z.string().optional(),
  startDatetime: z.string(),
  endDatetime: z.string().optional(),
  totalSlots: z.number().int().min(1, "At least 1 slot required"),
  dealPrice: z.number().min(0).optional(),
  originalPrice: z.number().min(0).optional(),
  displayedPrice: z.number().min(0).optional(),
});

export const updateVariantSchema = z.object({
  title: z.string().optional(),
  totalSlots: z.number().int().min(1).optional(),
  availableSlots: z.number().int().min(0).optional(),
  dealPrice: z.number().min(0).optional(),
  originalPrice: z.number().min(0).optional(),
  displayedPrice: z.number().min(0).optional(),
  status: z.enum(["active", "sold_out", "cancelled"]).optional(),
});

// ─── Bulk Operation Schemas ───

export const bulkCancelSchema = z.object({
  variantIds: z.array(z.string().uuid()).min(1),
});

export const bulkUpdatePriceSchema = z.object({
  variantIds: z.array(z.string().uuid()).min(1),
  dealPrice: z.number().min(0),
});

export const bulkUpdateSlotsSchema = z.object({
  variantIds: z.array(z.string().uuid()).min(1),
  totalSlots: z.number().int().min(1),
});

// ─── Recurring Rule Schemas ───

export const createRecurringRuleSchema = z.object({
  dealId: z.string().uuid(),
  repeatType: z.enum(["once", "daily", "weekly", "interval"]),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(),
  interval: z.number().int().min(1).optional(),
  startDate: z.string(),
  endDate: z.string(),
  timeOfDay: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Must be HH:mm format")
    .optional(),
  totalSlots: z.number().int().min(1),
  priceOverride: z.number().min(0).optional(),
});

export type CreateDealDto = z.infer<typeof createDealSchema>;
export type UpdateDealDto = z.infer<typeof updateDealSchema>;
export type CreateVariantDto = z.infer<typeof createVariantSchema>;
export type UpdateVariantDto = z.infer<typeof updateVariantSchema>;
export type BulkCancelDto = z.infer<typeof bulkCancelSchema>;
export type BulkUpdatePriceDto = z.infer<typeof bulkUpdatePriceSchema>;
export type BulkUpdateSlotsDto = z.infer<typeof bulkUpdateSlotsSchema>;
export type CreateRecurringRuleDto = z.infer<typeof createRecurringRuleSchema>;
