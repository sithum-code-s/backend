// ─── Public Deal Types ───

export interface LockDealInput {
  variantId: string;
  quantity: number;
}

export interface CreateBookingInput {
  lockId: string;
  paymentStatus?: "pending" | "paid" | "failed";
}

export interface PublicDealQueryParams {
  page?: number;
  limit?: number;
  location?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
}
