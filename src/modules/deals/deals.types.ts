import type { DealVariantStatus, RecurringType } from "@prisma/client";

// ─── Deal Category Enum ───
export enum DealCategory {
  DIVING = "diving",
  SNORKELING = "snorkeling",
  EXCURSION = "excursion",
  PACKAGE = "package",
  WATER_SPORT = "water-sport",
  FISHING = "fishing",
  CRUISE = "cruise",
  OTHER = "other",
}

// ─── Deal Types ───

export interface CreateDealInput {
  merchantId: string;
  title: string;
  description?: string;
  location?: string;
  category?: string;
  durationType?: string;
  durationDays?: number;
  durationHours?: number;
  dealPrice?: number;
  originalPrice?: number;
  displayedPrice?: number;
  primaryImageUrl?: string;
  secondImageUrl?: string;
  thirdImageUrl?: string;
  fourthImageUrl?: string;
  dealLockExpireTime?: number;
  itineraries?: CreateItineraryInput[];
  inclusions?: CreateInclusionInput[];
  exclusions?: CreateExclusionInput[];
}

export interface UpdateDealInput extends Partial<Omit<CreateDealInput, "merchantId">> {}

export interface CreateItineraryInput {
  dayNumber: number;
  title: string;
  description?: string;
}

export interface CreateInclusionInput {
  description: string;
}

export interface CreateExclusionInput {
  description: string;
  additionalPrice?: number;
}

// ─── Variant Types ───

export interface CreateVariantInput {
  dealId: string;
  title?: string;
  startDatetime: string; // ISO string
  endDatetime?: string;
  totalSlots: number;
  dealPrice?: number;
  originalPrice?: number;
  displayedPrice?: number;
}

export interface UpdateVariantInput {
  title?: string;
  totalSlots?: number;
  availableSlots?: number;
  dealPrice?: number;
  originalPrice?: number;
  displayedPrice?: number;
  status?: DealVariantStatus;
}

export interface BulkCancelInput {
  variantIds: string[];
}

export interface BulkUpdatePriceInput {
  variantIds: string[];
  dealPrice: number;
}

export interface BulkUpdateSlotsInput {
  variantIds: string[];
  totalSlots: number;
}

// ─── Recurring Rule Types ───

export interface CreateRecurringRuleInput {
  dealId: string;
  repeatType: RecurringType;
  daysOfWeek?: number[];
  interval?: number;
  startDate: string;
  endDate: string;
  timeOfDay?: string;     // "HH:mm"
  totalSlots: number;
  priceOverride?: number;
}

// ─── Query Params ───

export interface VariantQueryParams {
  dealId: string;
  status?: DealVariantStatus;
  startDate?: string;
  endDate?: string;
}

export interface DealAnalyticsParams {
  dealId: string;
  startDate?: string;
  endDate?: string;
}

export interface DealAnalytics {
  totalEarnings: number;
  bookings: any[];
  locks: any[];
}

export interface MerchantAnalyticsResponse {
  overall: {
    totalEarnings: number;
    totalBookings: number;
    totalLocks: number;
  };
  dealsBreakdown: {
    dealId: string;
    title: string;
    bookingsCount: number;
    locksCount: number;
    earnings: number;
  }[];
  timeSeriesRevenue: {
    date: string;
    earnings: number;
  }[];
}
