import * as repo from "./public-deals.repository";
import * as authRepo from "../auth/auth.repository";
import type { PublicDealQueryParams, LockDealInput, CreateBookingInput } from "./public-deals.types";

const createServiceError = (message: string, code: string, status: number) => {
  const error = new Error(message) as Error & { code?: string; status?: number };
  error.code = code;
  error.status = status;
  return error;
};

const ensureActiveUser = async (userId: string) => {
  const user = await authRepo.findUserById(userId);
  if (!user) {
    throw createServiceError("User not found", "USER_NOT_FOUND", 404);
  }
  if (user.status === "suspended") {
    throw createServiceError(
      "Your account is suspended. Contact admin for assistance.",
      "SUSPENDED_ACCOUNT",
      403
    );
  }
  return user;
};

// ─── Public Deal Service ───

export const getActiveDeals = async (params?: PublicDealQueryParams) => {
  return repo.getActiveDeals(params);
};

export const getDealDetail = async (id: string) => {
  const deal = await repo.getDealDetail(id);
  if (!deal) throw new Error("Deal not found");
  return deal;
};

// ─── Lock Service ───

export const lockDeal = async (userId: string, data: LockDealInput) => {
  await ensureActiveUser(userId);

  // 0. Check daily lock limit (5 locks per day)
  const todaysLockCount = await repo.countTodaysActiveLocks(userId);
  if (todaysLockCount >= 5) {
    throw createServiceError(
      "You have reached the daily limit of 5 locked deals. Try again tomorrow or complete booking for an existing lock.",
      "DAILY_LOCK_LIMIT_EXCEEDED",
      429
    );
  }

  // 1. Validate variant exists and has available slots
  const variant = await repo.getVariantById(data.variantId);
  if (!variant) throw new Error("Variant not found");
  if (variant.status !== "active") throw new Error("Variant is not available");
  if (!variant.startDatetime || variant.startDatetime <= new Date()) {
    throw new Error("Cannot lock a past variant");
  }
  if (variant.deal?.merchant?.userId === userId) {
    throw new Error("You cannot lock your own deals");
  }
  if (
    variant.availableSlots === null ||
    variant.availableSlots < data.quantity
  ) {
    throw new Error(
      `Only ${variant.availableSlots ?? 0} slots available, requested ${data.quantity}`
    );
  }

  // 2. Calculate lock expiry (use deal's lockExpireTime in minutes, default 60 min)
  const expireMinutes = variant.deal?.dealLockExpireTime ?? 60;
  const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000);

  // 3. Determine locked price
  const pricePerSlot = variant.displayedPrice ?? variant.dealPrice ?? 0;
  const lockedPrice = pricePerSlot * data.quantity;

  // 4. Create lock & decrement available slots atomically
  const lock = await repo.createLock({
    userId,
    dealId: variant.dealId,
    variantId: data.variantId,
    quantity: data.quantity,
    lockedPrice,
    expiresAt,
  });

  await repo.decrementVariantSlots(data.variantId, data.quantity);

  return lock;
};

export const getMyLocks = async (userId: string, pagination: { page: number; limit: number }) => {
  // Keep lock statuses fresh so recently expired locks are visible immediately in My Deals.
  await releaseExpiredLocks();

  const skip = (pagination.page - 1) * pagination.limit;
  const take = pagination.limit;
  return repo.getUserActiveLocks(userId, skip, take);
};

// ─── Booking Service ───

export const createBooking = async (userId: string, data: CreateBookingInput) => {
  await ensureActiveUser(userId);

  // 1. Validate lock
  const lock = await repo.getLockById(data.lockId);
  if (!lock) throw new Error("Lock not found");
  if (lock.userId !== userId) throw new Error("Unauthorized: lock belongs to another user");
  if (lock.status !== "active") throw new Error("Lock is no longer active");
  if (lock.deal?.merchant?.userId === userId) {
    throw new Error("You cannot book your own deal variants");
  }
  if (lock.expiresAt && lock.expiresAt < new Date()) {
    // 1.1 Mark as expired
    await repo.updateLockStatus(data.lockId, "expired");
    
    // 1.2 RETURN Slots to available pool
    if (lock.variantId && lock.quantity) {
      await repo.updateLockSlotStatus(data.lockId, "available");
      await repo.incrementVariantSlots(lock.variantId, lock.quantity);
    }

    throw new Error("Lock has expired");
  }

  // 2. Create booking
  const booking = await repo.createBooking({
    userId,
    dealId: lock.dealId!,
    variantId: lock.variantId!,
    lockId: data.lockId,
    quantity: lock.quantity ?? 1,
    totalPrice: lock.lockedPrice ?? 0,
    paymentStatus: data.paymentStatus,
  });

  // 3. Convert lock status
  await repo.updateLockStatus(data.lockId, "converted");

  return booking;
};

export const getMyBookings = async (userId: string, pagination: { page: number; limit: number }) => {
  const skip = (pagination.page - 1) * pagination.limit;
  const take = pagination.limit;
  return repo.getUserBookings(userId, skip, take);
};

// ─── Cleanup Task ───

/**
 * Sweeps the database for any locks that have naturally expired but are still in "active" status.
 * Increments their variant slots back and marks them as expired.
 */
export const releaseExpiredLocks = async () => {
  const expiredLocks = await repo.getExpiredActiveLocks();
  
  if (expiredLocks.length === 0) return { released: 0 };

  let count = 0;
  for (const lock of expiredLocks) {
    try {
      // Return slots
      if (lock.variantId && lock.quantity) {
        await repo.updateLockSlotStatus(lock.id, "available");
        await repo.incrementVariantSlots(lock.variantId, lock.quantity);
      }
      
      // Update status to expired
      await repo.updateLockStatus(lock.id, "expired");
      count++;
    } catch (err) {
      console.error(`Failed to release lock ${lock.id}:`, err);
    }
  }

  return { released: count };
};

// ─── Platform Stats Service ───

export const getPlatformStats = async () => {
  return repo.getPlatformStats();
};
