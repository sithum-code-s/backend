import { prisma } from "../../config/prisma";
import type { Prisma } from "@prisma/client";
import type {
  CreateDealInput,
  UpdateDealInput,
  CreateVariantInput,
  UpdateVariantInput,
  VariantQueryParams,
  CreateRecurringRuleInput,
  DealAnalyticsParams,
  DealAnalytics,
  MerchantAnalyticsResponse,
} from "./deals.types";

// ─── Deal Repository ───

export const createDeal = async (data: CreateDealInput) => {
  const { itineraries, inclusions, exclusions, ...dealData } = data;
  const displayedPrice = dealData.dealPrice ? Math.round(dealData.dealPrice * 1.03) : undefined;

  return prisma.deal.create({
    data: {
      ...dealData,
      displayedPrice,
      itineraries: itineraries
        ? { create: itineraries }
        : undefined,
      inclusions: inclusions
        ? { create: inclusions }
        : undefined,
      exclusions: exclusions
        ? { create: exclusions }
        : undefined,
    },
    include: {
      itineraries: true,
      inclusions: true,
      exclusions: true,
    },
  });
};

export const getDealById = async (id: string) => {
  return prisma.deal.findUnique({
    where: { id },
    include: {
      itineraries: { orderBy: { dayNumber: "asc" } },
      inclusions: true,
      exclusions: true,
      variants: {
        orderBy: { startDatetime: "asc" },
      },
      recurringRules: true,
      _count: { select: { bookings: true } },
    },
  });
};

export const countActiveBookingsByDeal = async (dealId: string) => {
  return prisma.booking.count({
    where: {
      dealId,
      paymentStatus: { in: ['paid', 'pending'] },
    },
  });
};

export const getDealsByMerchant = async (merchantId: string) => {
  return prisma.deal.findMany({
    where: { merchantId, isActive: true },
    include: {
      variants: {
        where: { status: "active" },
        select: { id: true, startDatetime: true, availableSlots: true, totalSlots: true, status: true },
      },
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const updateDeal = async (id: string, data: UpdateDealInput) => {
  const { itineraries, inclusions, exclusions, ...dealData } = data;
  
  const updatePayload: Prisma.DealUpdateInput = { ...dealData };
  if (dealData.dealPrice !== undefined) {
    updatePayload.displayedPrice = dealData.dealPrice ? Math.round(dealData.dealPrice * 1.03) : null;
  }

  // Update deal fields
  const deal = await prisma.deal.update({
    where: { id },
    data: updatePayload,
    include: {
      itineraries: true,
      inclusions: true,
      exclusions: true,
    },
  });

  // Replace itineraries if provided
  if (itineraries) {
    await prisma.itinerary.deleteMany({ where: { dealId: id } });
    await prisma.itinerary.createMany({
      data: itineraries.map((it) => ({ ...it, dealId: id })),
    });
  }

  // Replace inclusions if provided
  if (inclusions) {
    await prisma.inclusions.deleteMany({ where: { dealId: id } });
    await prisma.inclusions.createMany({
      data: inclusions.map((inc) => ({ ...inc, dealId: id })),
    });
  }

  // Replace exclusions if provided
  if (exclusions) {
    await prisma.exclusions.deleteMany({ where: { dealId: id } });
    await prisma.exclusions.createMany({
      data: exclusions.map((exc) => ({ ...exc, dealId: id })),
    });
  }

  return getDealById(id);
};

// ─── Variant Repository ───

export const createVariant = async (data: CreateVariantInput) => {
  const totalSlots = data.totalSlots || 0;
  return prisma.dealVariant.create({
    data: {
      dealId: data.dealId,
      title: data.title,
      startDatetime: new Date(data.startDatetime),
      endDatetime: data.endDatetime && !isNaN(new Date(data.endDatetime).getTime()) ? new Date(data.endDatetime) : undefined,
    totalSlots,
      availableSlots: totalSlots,
      dealPrice: data.dealPrice,
      originalPrice: data.originalPrice,
      displayedPrice: data.dealPrice ? Math.round(data.dealPrice * 1.03) : undefined,
      status: "active",
      slots: {
        create: Array.from({ length: totalSlots }).map((_, i) => ({
          slotNumber: i + 1,
          status: "available",
        })),
      },
    },
    include: { slots: true },
  });
};

export const createManyVariants = async (
  data: Prisma.DealVariantCreateManyInput[]
) => {
  return prisma.dealVariant.createMany({
    data,
    skipDuplicates: true,
  });
};

export const getVariantById = async (id: string) => {
  return prisma.dealVariant.findUnique({
    where: { id },
    include: {
      deal: { select: { title: true, location: true, merchantId: true } },
      bookings: {
        include: {
          user: { select: { id: true, name: true, email: true, contactNumber: true } },
          _count: { select: { slots: true } }
        },
      },
      locks: {
        where: {
          status: "active",
          expiresAt: { gt: new Date() },
        },
        include: {
          user: { select: { id: true, name: true } },
          _count: { select: { slots: true } },
        },
      },
      slots: {
        orderBy: { slotNumber: "asc" },
        include: {
          bookings: { 
            where: { paymentStatus: { in: ['paid', 'pending'] } },
            include: { 
              user: { select: { id: true, name: true, email: true, contactNumber: true } },
              _count: { select: { slots: true } }
            } 
          },
          locks: {
            where: { status: "active", expiresAt: { gt: new Date() } },
            include: { user: { select: { id: true, name: true } } }
          }
        }
      }
    },
  });
};

export const getVariantsByDeal = async (params: VariantQueryParams) => {
  const where: Prisma.DealVariantWhereInput = {
    dealId: params.dealId,
  };

  if (params.status) where.status = params.status;
  if (params.startDate || params.endDate) {
    where.startDatetime = {};
    if (params.startDate)
      (where.startDatetime as Prisma.DateTimeNullableFilter).gte = new Date(params.startDate);
    if (params.endDate)
      (where.startDatetime as Prisma.DateTimeNullableFilter).lte = new Date(params.endDate);
  }

  const variants = await prisma.dealVariant.findMany({
    where,
    orderBy: { startDatetime: "asc" },
    include: {
      bookings: {
        include: {
          user: { select: { id: true, name: true, email: true, contactNumber: true } },
        },
      },
      locks: {
        where: {
          status: "active",
          expiresAt: { gt: new Date() },
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
      slots: {
        orderBy: { slotNumber: "asc" },
        include: {
          bookings: { 
            where: { paymentStatus: { in: ['paid', 'pending'] } },
            include: { user: { select: { id: true, name: true, email: true, contactNumber: true } } } 
          },
          locks: {
            where: { status: "active", expiresAt: { gt: new Date() } },
            include: { user: { select: { id: true, name: true } } }
          }
        }
      },
      _count: { select: { bookings: true } },
    },
  });
  return variants;
};

export const updateVariant = async (id: string, data: UpdateVariantInput) => {
  const updateData: Prisma.DealVariantUpdateInput = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.totalSlots !== undefined) updateData.totalSlots = data.totalSlots;
  if (data.availableSlots !== undefined) updateData.availableSlots = data.availableSlots;
  
  if (data.dealPrice !== undefined) {
    updateData.dealPrice = data.dealPrice;
    updateData.displayedPrice = data.dealPrice ? Math.round(data.dealPrice * 1.03) : null;
  }
  if (data.originalPrice !== undefined) updateData.originalPrice = data.originalPrice;
  if (data.status !== undefined) updateData.status = data.status;

  await prisma.dealVariant.update({
    where: { id },
    data: updateData,
  });

  if (data.totalSlots !== undefined) {
    await syncSlots(id, data.totalSlots);
    await recalculateVariantAvailability(id);
  }

  return getVariantById(id);
};

export const cancelVariant = async (id: string) => {
  return prisma.dealVariant.update({
    where: { id },
    data: { status: "cancelled", availableSlots: 0 },
  });
};

export const deleteVariant = async (id: string) => {
  return prisma.dealVariant.delete({
    where: { id },
  });
};

export const bulkCancelVariants = async (ids: string[]) => {
  return prisma.dealVariant.updateMany({
    where: { id: { in: ids } },
    data: { status: "cancelled" },
  });
};

export const bulkUpdatePrice = async (ids: string[], dealPrice: number) => {
  const displayedPrice = Math.round(dealPrice * 1.03);
  return prisma.dealVariant.updateMany({
    where: { id: { in: ids } },
    data: { dealPrice, displayedPrice },
  });
};

export const bulkUpdateSlots = async (ids: string[], totalSlots: number) => {
  // We need to update each individually to handle availableSlots correctly
  const variants = await prisma.dealVariant.findMany({
    where: { id: { in: ids } },
  });

  for (const variant of variants) {
    const nonAvailableCount = await prisma.variantSlot.count({
      where: { variantId: variant.id, status: { not: "available" } }
    });
    
    const newAvailable = Math.max(0, totalSlots - nonAvailableCount);

    await prisma.dealVariant.update({
      where: { id: variant.id },
      data: {
        totalSlots,
        availableSlots: newAvailable,
        status: newAvailable === 0 ? "sold_out" : "active",
      },
    });

    await syncSlots(variant.id, totalSlots);
  }

  return { count: variants.length };
};

export const syncSlots = async (variantId: string, totalSlots: number) => {
  const currentSlots = await prisma.variantSlot.findMany({
    where: { variantId },
    orderBy: { slotNumber: "asc" },
  });

  if (currentSlots.length < totalSlots) {
    // Add missing slots
    const toCreate = Array.from({ length: totalSlots - currentSlots.length }).map((_, i) => ({
      variantId,
      slotNumber: currentSlots.length + i + 1,
      status: "available" as const,
    }));
    await prisma.variantSlot.createMany({ data: toCreate });
  } else if (currentSlots.length > totalSlots) {
    // Remove excess available slots
    const deletableSlots = currentSlots
      .filter(s => s.status === "available" || s.status === "cancelled")
      .reverse()
      .slice(0, currentSlots.length - totalSlots);

    if (deletableSlots.length > 0) {
      await prisma.variantSlot.deleteMany({
        where: { id: { in: deletableSlots.map(s => s.id) } }
      });
    }
  }
};

export const getSlotById = async (id: string) => {
  return prisma.variantSlot.findUnique({
    where: { id },
    include: { variant: { include: { deal: true } } }
  });
};

export const cancelSlot = async (id: string) => {
  const slot = await prisma.variantSlot.update({
    where: { id },
    data: { status: "cancelled" },
  });
  await recalculateVariantAvailability(slot.variantId);
  return slot;
};

export const restoreSlot = async (id: string) => {
  const slot = await prisma.variantSlot.update({
    where: { id },
    data: { status: "available" },
  });
  await recalculateVariantAvailability(slot.variantId);
  return slot;
};

export const recalculateVariantAvailability = async (variantId: string) => {
  const variant = await prisma.dealVariant.findUnique({
    where: { id: variantId },
    select: { totalSlots: true }
  });

  if (!variant) return;

  const nonAvailableCount = await prisma.variantSlot.count({
    where: { variantId, status: { not: "available" } }
  });

  const availableSlots = Math.max(0, (variant.totalSlots || 0) - nonAvailableCount);

  return prisma.dealVariant.update({
    where: { id: variantId },
    data: { 
      availableSlots,
      status: availableSlots === 0 ? "sold_out" : "active"
    }
  });
};

export const getVariantBookings = async (variantId: string) => {
  return prisma.booking.findMany({
    where: { variantId },
    include: {
      user: { select: { id: true, name: true } },
      _count: { select: { slots: true } }
    },
    orderBy: { createdAt: "desc" },
  });
};

// ─── Recurring Rule Repository ───

export const createRecurringRule = async (data: CreateRecurringRuleInput) => {
  return prisma.recurringRule.create({
    data: {
      dealId: data.dealId,
      repeatType: data.repeatType,
      daysOfWeek: data.daysOfWeek || [],
      interval: data.interval,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      timeOfDay: data.timeOfDay,
      totalSlots: data.totalSlots,
      priceOverride: data.priceOverride,
    },
  });
};

export const getRecurringRulesByDeal = async (dealId: string) => {
  return prisma.recurringRule.findMany({
    where: { dealId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
};

export const checkExistingVariant = async (
  dealId: string,
  startDatetime: Date
) => {
  return prisma.dealVariant.findUnique({
    where: {
      dealId_startDatetime: { dealId, startDatetime },
    },
  });
};

/**
 * Finds variants for a specific deal within a date range, regardless of time.
 * Used to enforce "one variant per day" rule.
 */
export const getVariantsByDateRange = async (
  dealId: string,
  startDate: Date,
  endDate: Date
) => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return prisma.dealVariant.findMany({
    where: {
      dealId,
      startDatetime: {
        gte: start,
        lte: end,
      },
      status: { not: "cancelled" },
    },
    select: {
      id: true,
      startDatetime: true,
    },
  });
};

export const getDealAnalytics = async (params: DealAnalyticsParams): Promise<DealAnalytics> => {
  const { dealId, startDate, endDate } = params;

  const dateFilter: Prisma.DateTimeFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  const [bookings, locks, earningsAggregate] = await Promise.all([
    // Get all bookings for the deal within date range
    prisma.booking.findMany({
      where: {
        dealId,
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true, contactNumber: true } },
        variant: { select: { id: true, startDatetime: true, title: true } },
        _count: { select: { slots: true } }
      },
      orderBy: { createdAt: "desc" },
    }),

    // Get all locks for the deal within date range
    prisma.dealLock.findMany({
      where: {
        dealId,
        status: "active",
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      include: {
        user: { select: { id: true, name: true } },
        variant: { select: { id: true, startDatetime: true, title: true } },
        _count: { select: { slots: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // Sum totalEarnings from paid bookings
    prisma.booking.aggregate({
      where: {
        dealId,
        paymentStatus: "paid",
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      _sum: {
        totalPrice: true,
      },
    }),
  ]);

  return {
    totalEarnings: earningsAggregate._sum.totalPrice || 0,
    bookings,
    locks,
  };
};

export const getMerchantOverallAnalytics = async (
  merchantId: string,
  startDate?: string,
  endDate?: string
): Promise<MerchantAnalyticsResponse> => {
  const dateFilter: Prisma.DateTimeFilter = {};
  if (startDate) dateFilter.gte = new Date(startDate);
  if (endDate) dateFilter.lte = new Date(endDate);

  // 1) Find all deals of the merchant
  const deals = await prisma.deal.findMany({
    where: { merchantId },
    select: { id: true, title: true }
  });

  const dealIds = deals.map(d => d.id);

  if (dealIds.length === 0) {
    return {
      overall: { totalEarnings: 0, totalBookings: 0, totalLocks: 0 },
      dealsBreakdown: [],
      timeSeriesRevenue: []
    };
  }

  // 2) Aggregated data for ALL deals
  const [overallEarnings, overallBookings, overallLocks] = await Promise.all([
    prisma.booking.aggregate({
      where: {
        dealId: { in: dealIds },
        paymentStatus: "paid",
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      _sum: { totalPrice: true }
    }),
    prisma.variantSlot.count({
      where: {
        status: "booked",
        bookings: {
          some: {
            dealId: { in: dealIds },
            createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
          }
        }
      }
    }),
    prisma.dealLock.aggregate({
      where: {
        dealId: { in: dealIds },
        status: { in: ["active", "converted", "expired"] },
        createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      },
      _sum: { quantity: true }
    })
  ]);

  // 3) Breakdown per deal
  const dealsBreakdown = await Promise.all(deals.map(async (deal) => {
    const [earnings, bookingsCount, locksCount] = await Promise.all([
      prisma.booking.aggregate({
        where: {
          dealId: deal.id,
          paymentStatus: "paid",
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        _sum: { totalPrice: true }
      }),
      prisma.variantSlot.count({
        where: {
          status: "booked",
          bookings: {
            some: {
              dealId: deal.id,
              createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
            }
          }
        }
      }),
      prisma.dealLock.aggregate({
        where: {
          dealId: deal.id,
          status: { in: ["active", "converted", "expired"] },
          createdAt: Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
        },
        _sum: { quantity: true }
      })
    ]);

    return {
      dealId: deal.id,
      title: deal.title || "Untitled",
      bookingsCount,
      locksCount: locksCount._sum.quantity || 0,
      earnings: earnings._sum.totalPrice || 0,
    };
  }));

  return {
    overall: {
      totalEarnings: overallEarnings._sum.totalPrice || 0,
      totalBookings: overallBookings,
      totalLocks: overallLocks._sum.quantity || 0,
    },
    dealsBreakdown: dealsBreakdown.sort((a,b) => b.earnings - a.earnings),
    timeSeriesRevenue: await calculateTimeSeriesRevenue(dealIds, startDate, endDate),
  };
};

const calculateTimeSeriesRevenue = async (dealIds: string[], start?: string, end?: string) => {
  const startDate = start ? new Date(start) : new Date(new Date().setDate(new Date().getDate() - 7));
  const endDate = end ? new Date(end) : new Date();

  const timeSeries: { date: string; earnings: number }[] = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayStart = new Date(d);
    dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23,59,59,999);

    const agg = await prisma.booking.aggregate({
      where: {
        dealId: { in: dealIds },
        paymentStatus: "paid",
        createdAt: { gte: dayStart, lte: dayEnd }
      },
      _sum: { totalPrice: true }
    });

    timeSeries.push({
      date: dayStart.toISOString().split('T')[0],
      earnings: agg._sum.totalPrice || 0
    });
  }

  return timeSeries;
};
