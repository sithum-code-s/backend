import { prisma } from "../../config/prisma";
import type { Prisma, LockStatus } from "@prisma/client";
import type { PublicDealQueryParams } from "./public-deals.types";

// ─── Public Deal Repository ───

/**
 * Get all active deals with their upcoming (future) active variants.
 * Used for the home page card listing.
 */
export const getActiveDeals = async (params?: PublicDealQueryParams) => {
  const page = params?.page || 1;
  const limit = params?.limit || 10;
  const skip = (page - 1) * limit;

  const variantConditions: Prisma.DealVariantWhereInput = {
    status: "active",
    startDatetime: { gte: new Date() },
    availableSlots: { gt: 0 },
  };

  if (params?.minPrice !== undefined || params?.maxPrice !== undefined) {
    variantConditions.displayedPrice = {
      gte: params.minPrice,
      lte: params.maxPrice,
    };
  }

  const where: Prisma.DealWhereInput = {
    isActive: true,
    merchant: {
      verificationStatus: "verified",
    },
    variants: {
      some: variantConditions,
    },
  };

  if (params?.location) {
    where.location = { contains: params.location, mode: "insensitive" };
  }
  if (params?.category && params.category !== "all") {
    // Exact match for category normally, or contains if flexible
    where.category = { equals: params.category, mode: "insensitive" };
  }
  if (params?.search) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
      { location: { contains: params.search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      skip,
      take: limit,
      include: {
        merchant: {
          select: {
            id: true,
            businessName: true,
            logoUrl: true,
          },
        },
        inclusions: { select: { id: true, description: true } },
        variants: {
          where: variantConditions,
          orderBy: { startDatetime: "asc" },
          select: {
            id: true,
            title: true,
            dealPrice: true,
            originalPrice: true,
            displayedPrice: true,
            startDatetime: true,
            endDatetime: true,
            totalSlots: true,
            availableSlots: true,
            status: true,
          },
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.deal.count({ where }),
  ]);

  return { data, total };
};

/**
 * Get a single deal with full details for the detail page.
 * Includes all future variants, itineraries, inclusions, exclusions.
 */
export const getDealDetail = async (id: string) => {
  return prisma.deal.findFirst({
    where: {
      id,
      isActive: true,
      merchant: {
        verificationStatus: "verified",
      },
    },
    include: {
      merchant: {
        select: {
          id: true,
          businessName: true,
          businessDescription: true,
          logoUrl: true,
          city: true,
          country: true,
        },
      },
      itineraries: {
        orderBy: { dayNumber: "asc" },
      },
      inclusions: true,
      exclusions: true,
      variants: {
        where: {
          status: "active",
          startDatetime: { gte: new Date() },
        },
        orderBy: { startDatetime: "asc" },
        include: {
          _count: { select: { bookings: true, locks: true } },
        },
      },
    },
  });
};

// ─── Lock Repository ───

export const createLock = async (data: {
  userId: string;
  dealId: string;
  variantId: string;
  quantity: number;
  lockedPrice: number;
  expiresAt: Date;
}) => {
  const availableSlots = await prisma.variantSlot.findMany({
    where: { 
      variantId: data.variantId, 
      status: "available" 
    },
    take: data.quantity,
    orderBy: { slotNumber: "asc" }
  });

  if (availableSlots.length < data.quantity) {
    throw new Error("Not enough available slots");
  }

  // Update slots to locked
  await prisma.variantSlot.updateMany({
    where: { id: { in: availableSlots.map(s => s.id) } },
    data: { status: "locked" }
  });

  return prisma.dealLock.create({
    data: {
      userId: data.userId,
      dealId: data.dealId,
      variantId: data.variantId,
      quantity: data.quantity,
      lockedPrice: data.lockedPrice,
      expiresAt: data.expiresAt,
      status: "active",
      slots: {
        connect: availableSlots.map(s => ({ id: s.id }))
      }
    },
    include: {
      variant: {
        select: {
          id: true,
          title: true,
          startDatetime: true,
          endDatetime: true,
          dealPrice: true,
          displayedPrice: true,
        },
      },
      deal: {
        select: {
          id: true,
          title: true,
          location: true,
          primaryImageUrl: true,
          dealLockExpireTime: true,
        },
      },
      slots: true
    },
  });
};

export const getUserActiveLocks = async (userId: string, skip: number, take: number) => {
  const where: Prisma.DealLockWhereInput = {
    userId,
    status: { in: ["active", "expired"] as LockStatus[] },
  };

  const [data, total] = await Promise.all([
    prisma.dealLock.findMany({
      where,
      skip,
      take,
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            location: true,
            primaryImageUrl: true,
            category: true,
          },
        },
        variant: {
          select: {
            id: true,
            title: true,
            startDatetime: true,
            endDatetime: true,
            dealPrice: true,
            displayedPrice: true,
            availableSlots: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dealLock.count({ where }),
  ]);

  return { data, total };
};

// Count active locks created today by a user
export const countTodaysActiveLocks = async (userId: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.dealLock.count({
    where: {
      userId,
      status: "active",
      createdAt: {
        gte: today,
        lt: tomorrow,
      },
    },
  });
};

export const getLockById = async (id: string) => {
  return prisma.dealLock.findUnique({
    where: { id },
    include: {
      slots: { select: { id: true } },
      variant: true,
      deal: {
        include: {
          merchant: { select: { userId: true } },
        },
      },
    },
  });
};

export const updateLockStatus = async (
  id: string,
  status: "active" | "expired" | "converted"
) => {
  return prisma.dealLock.update({
    where: { id },
    data: { status },
  });
};

export const updateLockSlotStatus = async (lockId: string, status: "available" | "booked" | "locked") => {
  return prisma.variantSlot.updateMany({
    where: {
      locks: {
        some: { id: lockId },
      },
    },
    data: { status },
  });
};

// ─── Booking Repository ───



export const createBooking = async (data: {
  userId: string;
  dealId: string;
  variantId: string;
  lockId: string;
  quantity: number;
  totalPrice: number;
  paymentStatus?: "pending" | "paid" | "failed";
}) => {
  // Find slots from lock or variant
  let slotIds: string[] = [];
  if (data.lockId) {
    const lock = await prisma.dealLock.findUnique({
      where: { id: data.lockId },
      include: { slots: { select: { id: true } } }
    });
    slotIds = lock?.slots.map(s => s.id) || [];
  } else {
    // Fallback search for available slots
    const available = await prisma.variantSlot.findMany({
      where: { variantId: data.variantId, status: "available" },
      take: data.quantity,
      select: { id: true }
    });
    slotIds = available.map(s => s.id);
  }

  // Update slots to booked
  await prisma.variantSlot.updateMany({
    where: { id: { in: slotIds } },
    data: { status: "booked" }
  });

  return prisma.booking.create({
    data: {
      userId: data.userId,
      dealId: data.dealId,
      variantId: data.variantId,
      lockId: data.lockId,
      quantity: data.quantity,
      totalPrice: data.totalPrice,
      paymentStatus: data.paymentStatus || "pending",
      slots: {
        connect: slotIds.map(id => ({ id }))
      }
    },
    include: {
      deal: {
        select: {
          id: true,
          title: true,
          location: true,
          primaryImageUrl: true,
          category: true,
          durationDays: true,
        },
      },
      variant: {
        select: {
          id: true,
          title: true,
          startDatetime: true,
          endDatetime: true,
        },
      },
      slots: true
    },
  });
};

export const getUserBookings = async (userId: string, skip: number, take: number) => {
  const where = { userId };

  const [data, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take,
      include: {
        deal: {
          select: {
            id: true,
            title: true,
            location: true,
            primaryImageUrl: true,
            category: true,
            durationDays: true,
          },
        },
        variant: {
          select: {
            id: true,
            title: true,
            startDatetime: true,
            endDatetime: true,
            dealPrice: true,
            displayedPrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.booking.count({ where }),
  ]);

  return { data, total };
};

// ─── Variant Helpers ───

export const getVariantById = async (id: string) => {
  return prisma.dealVariant.findUnique({
    where: { id },
    include: {
      deal: {
        select: {
          id: true,
          dealLockExpireTime: true,
          merchant: { select: { userId: true } }
        },
      },
    },
  });
};

export const decrementVariantSlots = async (id: string, quantity: number, lockId?: string) => {
  // If lockId is provided, the slots are already "locked" (or we should mark them as such)
  // This is usually called from public service after createLock
  return prisma.dealVariant.update({
    where: { id },
    data: {
      availableSlots: { decrement: quantity },
    },
  });
};

export const incrementVariantSlots = async (id: string, quantity: number) => {
  return prisma.dealVariant.update({
    where: { id },
    data: {
      availableSlots: { increment: quantity },
    },
  });
};

export const getExpiredActiveLocks = async () => {
  const now = new Date();
  return prisma.dealLock.findMany({
    where: {
      status: "active",
      expiresAt: { lt: now },
    },
  });
};

// ─── Platform Stats Repository ───

export const getPlatformStats = async () => {
  const [totalDeals, totalTravellers, totalLocks] = await Promise.all([
    // Active deals on the platform
    prisma.deal.count({
      where: {
        isActive: true,
        merchant: {
          verificationStatus: "verified",
        },
      },
    }),
    // Active travellers on the platform
    prisma.user.count({
      where: { isTraveller: true },
    }),
    // Currently active (non-expired) locks
    prisma.dealLock.count({
            where: {
                status: "active",
                expiresAt: { gte: new Date() },
            },
        }),
  ]);

  return {
    totalDeals,
    totalTravellers,
    totalLocks,
  };
};
