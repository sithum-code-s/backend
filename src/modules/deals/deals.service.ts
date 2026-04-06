import type { Prisma } from "@prisma/client";
import * as repo from "./deals.repository";
import type {
  CreateDealInput,
  UpdateDealInput,
  CreateVariantInput,
  UpdateVariantInput,
  CreateRecurringRuleInput,
  VariantQueryParams,
  DealAnalyticsParams,
  DealAnalytics,
  MerchantAnalyticsResponse,
} from "./deals.types";

const normalizeDurationToDays = <T extends { durationType?: string; durationHours?: number; durationDays?: number }>(
  data: T
): T => {
  return {
    ...data,
    durationType: "days",
    durationHours: undefined,
  };
};

// ─── Deal Service ───

export const createDeal = async (merchantId: string, data: Omit<CreateDealInput, "merchantId">) => {
  const normalizedData = normalizeDurationToDays(data);
  return repo.createDeal({ ...normalizedData, merchantId });
};

export const getDealById = async (id: string) => {
  const deal = await repo.getDealById(id);
  if (!deal) throw new Error("Deal not found");
  return deal;
};

export const getDealsByMerchant = async (merchantId: string) => {
  return repo.getDealsByMerchant(merchantId);
};

export const updateDeal = async (id: string, merchantId: string, data: UpdateDealInput) => {
  const existing = await repo.getDealById(id);
  if (!existing) throw new Error("Deal not found");
  if (existing.merchantId !== merchantId) {
    throw new Error("Unauthorized: You do not own this deal");
  }

  if (data.displayedPrice !== undefined) {
    throw new Error("Cannot edit displayed price directly");
  }

  const activeBookingsCount = await repo.countActiveBookingsByDeal(id);
  if (activeBookingsCount > 0) {
    throw new Error("Cannot edit deal details: this deal already has bookings");
  }

  const normalizedData = normalizeDurationToDays(data);
  return repo.updateDeal(id, normalizedData);
};

export const getDealAnalytics = async (dealId: string, merchantId: string, startDate?: string, endDate?: string): Promise<DealAnalytics> => {
  const deal = await repo.getDealById(dealId);
  if (!deal) throw new Error("Deal not found");
  if (deal.merchantId !== merchantId) {
    throw new Error("Unauthorized: You do not own this deal");
  }

  return repo.getDealAnalytics({ dealId, startDate, endDate });
};

export const getMerchantOverallAnalytics = async (merchantId: string, startDate?: string, endDate?: string): Promise<MerchantAnalyticsResponse> => {
  return repo.getMerchantOverallAnalytics(merchantId, startDate, endDate);
};

// ─── Variant Service ───

/**
 * Checks if any variants already exist for the selected dates.
 * Enforces "One variant per day" rule.
 */
export const checkVariantAvailability = async (dealId: string, startDate: string, endDate: string) => {
  const conflicting = await repo.getVariantsByDateRange(dealId, new Date(startDate), new Date(endDate));
  return conflicting.map(v => v.startDatetime?.toISOString());
};

export const createVariant = async (merchantId: string, data: CreateVariantInput) => {
  const deal = await repo.getDealById(data.dealId);
  if (!deal) throw new Error("Deal not found");
  if (deal.merchantId !== merchantId) {
    throw new Error("Unauthorized: You do not own this deal");
  }

  if (new Date(data.startDatetime) < new Date()) {
    throw new Error("Cannot create a variant in the past");
  }

  // Check for existing variant on the SAME DAY (Regardless of time)
  const existingOnDay = await repo.getVariantsByDateRange(
    data.dealId,
    new Date(data.startDatetime),
    new Date(data.startDatetime)
  );
  
  if (existingOnDay.length > 0) {
    throw new Error("A variant already exists for this deal on the specified date");
  }

  return repo.createVariant(data);
};

export const getVariantById = async (id: string) => {
  const variant = await repo.getVariantById(id);
  if (!variant) throw new Error("Variant not found");
  return variant;
};

export const getVariantsByDeal = async (params: VariantQueryParams) => {
  return repo.getVariantsByDeal(params);
};

export const updateVariant = async (id: string, merchantId: string, data: UpdateVariantInput) => {
  const existing: any = await repo.getVariantById(id);
  if (!existing) throw new Error("Variant not found");

  if (existing.deal.merchantId !== merchantId) {
    throw new Error("Unauthorized: You do not own this deal");
  }

  const occupiedSlots = existing.slots.filter((s: any) => s.status === 'booked' || s.status === 'locked').length;

  // Constraint 1: Cannot decrease below booked/locked slots
  if (data.totalSlots !== undefined && data.totalSlots < occupiedSlots) {
    throw new Error(`Cannot decrease slots below ${occupiedSlots} (number of booked/locked slots)`);
  }

  // Constraint 2: Cannot update price if any slot is booked or locked
  if (data.dealPrice !== undefined && occupiedSlots > 0 && data.dealPrice !== existing.dealPrice) {
    throw new Error("Cannot update price when slots are already booked or locked");
  }

  // Prevent setting availableSlots higher than totalSlots
  if (data.availableSlots !== undefined && (data.totalSlots ?? existing.totalSlots) !== undefined) {
    const finalTotal = data.totalSlots ?? existing.totalSlots;
    if (data.availableSlots > finalTotal) {
      throw new Error("Available slots cannot exceed total slots");
    }
  }

  const updated = await repo.updateVariant(id, data);

  // Auto-update status based on slots
  if (updated && updated.availableSlots === 0 && updated.status === "active") {
    return repo.updateVariant(id, { status: "sold_out" });
  }

  return updated;
}

export const cancelVariant = async (id: string, merchantId: string) => {
  const existing: any = await repo.getVariantById(id);
  if (!existing) throw new Error("Variant not found");

  // Ownership Check
  if (existing.deal.merchantId !== merchantId) {
    throw new Error("Unauthorized: You do not own this deal");
  }

  // Occupancy Check (Only Paid or Pending bookings)
  const activeBookings = (existing.bookings as any[])?.filter(b => b.paymentStatus === 'paid' || b.paymentStatus === 'pending') || [];
  if (activeBookings.length > 0) {
    throw new Error("Cannot cancel variant: It has active bookings");
  }

  // Active locks already filtered by repository (expiresAt > now)
  if ((existing.locks?.length || 0) > 0) {
    throw new Error("Cannot cancel variant: It has active locks");
  }

  return repo.cancelVariant(id);
};

export const cancelSlot = async (slotId: string, merchantId: string) => {
  const slot: any = await repo.getSlotById(slotId);
  if (!slot) throw new Error("Slot not found");

  if (slot.variant.deal.merchantId !== merchantId) {
    throw new Error("Unauthorized: You do not own this deal");
  }

  if (slot.status === "booked" || slot.status === "locked") {
    throw new Error(`Cannot cancel slot: It is currently ${slot.status}`);
  }

  return repo.cancelSlot(slotId);
};

export const restoreSlot = async (slotId: string, merchantId: string) => {
  const slot: any = await repo.getSlotById(slotId);
  if (!slot) throw new Error("Slot not found");

  if (slot.variant.deal.merchantId !== merchantId) {
    throw new Error("Unauthorized: You do not own this deal");
  }

  // Can only restore if currently cancelled
  if (slot.status !== "cancelled") {
    throw new Error(`Cannot restore slot: It is already ${slot.status}`);
  }

  return repo.restoreSlot(slotId);
};

export const getVariantBookings = async (variantId: string) => {
  return repo.getVariantBookings(variantId);
};

// ─── Bulk Operations ───

export const deleteVariant = async (id: string, merchantId: string) => {
  const existing: any = await repo.getVariantById(id);
  if (!existing) throw new Error("Variant not found");

  if (existing.deal.merchantId !== merchantId) {
    throw new Error("Unauthorized: You do not own this deal");
  }

  const activeBookings = (existing.bookings as any[])?.filter(b => b.paymentStatus === 'paid' || b.paymentStatus === 'pending') || [];
  if (activeBookings.length > 0) {
    throw new Error("Cannot delete variant: It has active bookings");
  }
  if ((existing.locks?.length || 0) > 0) {
    throw new Error("Cannot delete variant: It has active locks");
  }

  return repo.deleteVariant(id);
};

export const bulkCancelVariants = async (variantIds: string[]) => {
  return repo.bulkCancelVariants(variantIds);
};

export const bulkUpdatePrice = async (variantIds: string[], dealPrice: number) => {
  return repo.bulkUpdatePrice(variantIds, dealPrice);
};

export const bulkUpdateSlots = async (variantIds: string[], totalSlots: number) => {
  return repo.bulkUpdateSlots(variantIds, totalSlots);
};

// ─── Recurring Rule + Variant Generation ───

export const createRecurringRule = async (merchantId: string, data: CreateRecurringRuleInput) => {
  const deal = await repo.getDealById(data.dealId);
  if (!deal) throw new Error("Deal not found");
  if (deal.merchantId !== merchantId) {
    throw new Error("Unauthorized: You do not own this deal");
  }

  const rule = await repo.createRecurringRule(data);

  // Generate variants from this rule
  const generatedDates = generateDatesFromRule(data);
  const futureDates = generatedDates.filter(d => d > new Date());
  
  if (futureDates.length === 0) {
    throw new Error("Recurring rule would not generate any future dates");
  }

  // Check for existing variants on any of the futureDates days
  for (const date of futureDates) {
    const existingOnDay = await repo.getVariantsByDateRange(data.dealId, date, date);
    if (existingOnDay.length > 0) {
      throw new Error(`A variant already exists on ${date.toDateString()}. Please select a range without conflicts.`);
    }
  }
  
  let generatedCount = 0;
  for (const date of futureDates) {
    await repo.createVariant({
      dealId: data.dealId,
      title: undefined,
      startDatetime: date.toISOString(),
      endDatetime: deal.durationHours 
        ? new Date(date.getTime() + deal.durationHours * 60 * 60 * 1000).toISOString()
        : undefined,
      totalSlots: data.totalSlots || 0,
      dealPrice: data.priceOverride ?? deal.dealPrice ?? 0,
      originalPrice: data.priceOverride ? undefined : deal.originalPrice ?? undefined,
    });
    generatedCount++;
  }

  return {
    rule,
    generatedCount,
    previewDates: futureDates.map((d) => d.toISOString()),
  };
};

export const previewRecurringDates = (data: CreateRecurringRuleInput): string[] => {
  const dates = generateDatesFromRule(data);
  return dates
    .filter((d) => d > new Date())
    .map((d) => d.toISOString());
};

export const getRecurringRulesByDeal = async (dealId: string) => {
  return repo.getRecurringRulesByDeal(dealId);
};

// ─── Date Generation Logic ───

function generateDatesFromRule(rule: CreateRecurringRuleInput): Date[] {
  const dates: Date[] = [];
  const start = new Date(rule.startDate);
  const end = new Date(rule.endDate);

  // Parse time of day
  let hours = 9;
  let minutes = 0;
  if (rule.timeOfDay) {
    const [h, m] = rule.timeOfDay.split(":").map(Number);
    hours = h;
    minutes = m;
  }

  switch (rule.repeatType) {
    case "once": {
      const date = new Date(start);
      date.setHours(hours, minutes, 0, 0);
      dates.push(date);
      break;
    }

    case "daily": {
      const current = new Date(start);
      while (current <= end) {
        const date = new Date(current);
        date.setHours(hours, minutes, 0, 0);
        dates.push(date);
        current.setDate(current.getDate() + 1);
      }
      break;
    }

    case "weekly": {
      const daysOfWeek = rule.daysOfWeek || [];
      const current = new Date(start);
      while (current <= end) {
        if (daysOfWeek.includes(current.getDay())) {
          const date = new Date(current);
          date.setHours(hours, minutes, 0, 0);
          dates.push(date);
        }
        current.setDate(current.getDate() + 1);
      }
      break;
    }

    case "interval": {
      const intervalDays = rule.interval || 1;
      const current = new Date(start);
      while (current <= end) {
        const date = new Date(current);
        date.setHours(hours, minutes, 0, 0);
        dates.push(date);
        current.setDate(current.getDate() + intervalDays);
      }
      break;
    }
  }

  return dates;
}
