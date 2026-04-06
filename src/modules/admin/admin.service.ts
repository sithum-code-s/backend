import { prisma } from "../../config/prisma";
import { supabase } from "../../config/supabase";
import type {
  AdminDashboardResponse,
  AdminMerchantListItem,
  MerchantDetailsResponse,
  MerchantDealSummary,
  AdminUserListItem,
  AdminUserDetailsResponse,
  AdminDealRequestItem,
  PaginatedResponse,
} from "./admin.types";
import type {
  MerchantListQueryDto,
  UserListQueryDto,
  DealRequestListQueryDto,
  PublicDealRequestDto,
} from "./admin.dto";

const COMMISSION_RATE = 0.03;

const buildDateFilter = (startDate?: string, endDate?: string) => {
  if (!startDate && !endDate) return undefined;
  return {
    ...(startDate ? { gte: new Date(startDate) } : {}),
    ...(endDate ? { lte: new Date(endDate) } : {}),
  };
};

const buildPlatformRevenue = (prices: Array<number | null | undefined>) => {
  const revenue = prices.reduce((sum: number, value) => sum + Number(value ?? 0), 0);
  const platformCommission = Math.round(revenue * COMMISSION_RATE * 100) / 100;
  const merchantPayout = Math.round((revenue - platformCommission) * 100) / 100;

  return {
    totalRevenueGenerated: Math.round(revenue * 100) / 100,
    platformCommission,
    merchantPayout,
  };
};

const toDayKey = (value: Date) => {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  return day.toISOString().split("T")[0];
};

const deleteMediaFilesFromStorage = async (mediaUrls: string[]): Promise<void> => {
  if (!mediaUrls.length) return;

  const filePaths = mediaUrls
    .map((url) => {
      try {
        const match = url.match(/\/tourist-image\/(.+)$/);
        return match ? match[1] : null;
      } catch {
        return null;
      }
    })
    .filter((path): path is string => path !== null);

  if (!filePaths.length) return;

  try {
    const { error } = await supabase.storage.from("tourist-image").remove(filePaths);
    if (error) {
      console.error("Error deleting media files from Supabase:", error.message);
    }
  } catch (error) {
    console.error("Exception while deleting media files:", error);
  }
};

const getCommentTreeMediaUrls = async (commentId: string): Promise<string[]> => {
  const rootComment = await prisma.communityComment.findUnique({
    where: { id: commentId },
    select: { id: true, postId: true },
  });

  if (!rootComment) {
    throw new Error("Comment not found");
  }

  const commentsInPost = await prisma.communityComment.findMany({
    where: { postId: rootComment.postId },
    select: {
      id: true,
      parentId: true,
      media: {
        select: { url: true },
      },
    },
  });

  const childrenByParent = new Map<string, string[]>();
  for (const comment of commentsInPost) {
    if (!comment.parentId) continue;
    const existing = childrenByParent.get(comment.parentId) ?? [];
    existing.push(comment.id);
    childrenByParent.set(comment.parentId, existing);
  }

  const idsToDelete = new Set<string>();
  const queue: string[] = [commentId];

  while (queue.length > 0) {
    const currentId = queue.shift() as string;
    if (idsToDelete.has(currentId)) continue;

    idsToDelete.add(currentId);
    const children = childrenByParent.get(currentId) ?? [];
    queue.push(...children);
  }

  return commentsInPost
    .filter((comment) => idsToDelete.has(comment.id))
    .flatMap((comment) => comment.media.map((media) => media.url));
};

export const getDashboard = async (
  query: { startDate?: string; endDate?: string }
): Promise<AdminDashboardResponse> => {
  const createdAtFilter = buildDateFilter(query.startDate, query.endDate);

  const [totalUsers, totalMerchants, totalDeals, totalBookings, totalLocks, paidBookings] = await Promise.all([
    prisma.user.count({ where: createdAtFilter ? { createdAt: createdAtFilter } : undefined }),
    prisma.merchantProfile.count({ where: createdAtFilter ? { createdAt: createdAtFilter } : undefined }),
    prisma.deal.count({ where: createdAtFilter ? { createdAt: createdAtFilter } : undefined }),
    prisma.booking.count({
      where: {
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      },
    }),
    prisma.dealLock.count({ where: createdAtFilter ? { createdAt: createdAtFilter } : undefined }),
    prisma.booking.findMany({
      where: {
        paymentStatus: "paid",
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
      },
      select: {
        createdAt: true,
        quantity: true,
        variant: {
          select: {
            displayedPrice: true,
            dealPrice: true,
          },
        },
        deal: {
          select: {
            displayedPrice: true,
            dealPrice: true,
          },
        },
      },
    }),
  ]);

  const dailyIncome = new Map<string, number>();
  let totalPlatformIncome = 0;

  for (const booking of paidBookings) {
    const displayedPrice = booking.variant?.displayedPrice ?? booking.deal?.displayedPrice ?? 0;
    const dealPrice = booking.variant?.dealPrice ?? booking.deal?.dealPrice ?? 0;
    const quantity = booking.quantity ?? 1;
    const income = Math.max(0, (displayedPrice - dealPrice) * quantity);

    totalPlatformIncome += income;

    const dayKey = toDayKey(booking.createdAt);
    dailyIncome.set(dayKey, (dailyIncome.get(dayKey) ?? 0) + income);
  }

  const platformIncomeSeries = Array.from(dailyIncome.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, income]) => ({
      date,
      income: Math.round(income * 100) / 100,
    }));

  return {
    totalUsers,
    totalMerchants,
    totalDeals,
    totalBookings,
    totalLocks,
    totalPlatformRevenue: Math.round(totalPlatformIncome * 100) / 100,
    platformIncomeSeries,
  };
};

export const listMerchants = async (
  query: MerchantListQueryDto
): Promise<PaginatedResponse<AdminMerchantListItem>> => {
  const skip = (query.page - 1) * query.limit;
  const where: any = {
    ...(query.verificationStatus ? { verificationStatus: query.verificationStatus } : {}),
    ...(query.search
      ? {
          OR: [
            { businessName: { contains: query.search, mode: "insensitive" } },
            { businessDescription: { contains: query.search, mode: "insensitive" } },
            { contactNumber: { contains: query.search, mode: "insensitive" } },
            { city: { contains: query.search, mode: "insensitive" } },
            { country: { contains: query.search, mode: "insensitive" } },
            { user: { is: { name: { contains: query.search, mode: "insensitive" } } } },
            { user: { is: { email: { contains: query.search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [total, merchants] = await Promise.all([
    prisma.merchantProfile.count({ where }),
    prisma.merchantProfile.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { deals: true } },
      },
    }),
  ]);

  return {
    total,
    page: query.page,
    limit: query.limit,
    data: merchants.map((merchant) => ({
      ...merchant,
      createdAt: merchant.createdAt.toISOString(),
    })),
  };
};

export const verifyMerchant = async (id: string) => {
  return prisma.merchantProfile.update({
    where: { id },
    data: { verificationStatus: "verified" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

export const unverifyMerchant = async (id: string) => {
  return prisma.merchantProfile.update({
    where: { id },
    data: { verificationStatus: "pending" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

export const getMerchantDetails = async (
  merchantId: string,
  query: { startDate?: string; endDate?: string }
): Promise<MerchantDetailsResponse> => {
  const createdAtFilter = buildDateFilter(query.startDate, query.endDate);

  const merchant = await prisma.merchantProfile.findUnique({
    where: { id: merchantId },
    include: { user: { select: { id: true, name: true, email: true } } },
  });

  if (!merchant) {
    throw new Error("Merchant not found");
  }

  const deals = await prisma.deal.findMany({
    where: { merchantId },
    select: {
      id: true,
      title: true,
      displayedPrice: true,
      locks: {
        where: createdAtFilter ? { createdAt: createdAtFilter } : undefined,
        select: { id: true },
      },
      bookings: {
        where: createdAtFilter ? { createdAt: createdAtFilter, paymentStatus: "paid" } : { paymentStatus: "paid" },
        select: { id: true, totalPrice: true },
      },
    },
  });

  const merchantDeals: MerchantDealSummary[] = deals.map((deal) => ({
    dealId: deal.id,
    title: deal.title,
    displayedPrice: deal.displayedPrice,
    locksCount: deal.locks.length,
    bookingsCount: deal.bookings.length,
  }));

  const totalDeals = await prisma.deal.count({ where: { merchantId } });
  const totalLocks = deals.reduce((sum, deal) => sum + deal.locks.length, 0);
  const totalBookings = deals.reduce((sum, deal) => sum + deal.bookings.length, 0);
  const revenue = deals.reduce(
    (sum, deal) => sum + deal.bookings.reduce((bookingSum, booking) => bookingSum + (booking.totalPrice || 0), 0),
    0
  );
  const platformCommission = Math.round(revenue * COMMISSION_RATE * 100) / 100;
  const merchantPayout = Math.round((revenue - platformCommission) * 100) / 100;

  return {
    merchant: {
      id: merchant.id,
      userId: merchant.userId,
      businessName: merchant.businessName,
      businessDescription: merchant.businessDescription,
      contactNumber: merchant.contactNumber,
      logoUrl: merchant.logoUrl,
      address: merchant.address,
      city: merchant.city,
      country: merchant.country,
      verificationStatus: merchant.verificationStatus,
      createdAt: merchant.createdAt.toISOString(),
      user: merchant.user,
    },
    analytics: {
      totalDeals,
      totalLocks,
      totalBookings,
      totalRevenueGenerated: Math.round(revenue * 100) / 100,
      platformCommission,
      merchantPayout,
    },
    deals: merchantDeals,
  };
};

export const updateDealDisplayPrice = async (dealId: string, displayedPrice: number) => {
  return prisma.deal.update({
    where: { id: dealId },
    data: { displayedPrice },
  });
};

export const listUsers = async (
  query: UserListQueryDto
): Promise<PaginatedResponse<AdminUserListItem>> => {
  const skip = (query.page - 1) * query.limit;
  const where: any = {
    isTraveller: true,
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
            { contactNumber: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: { createdAt: "desc" },
      include: {
        merchantProfile: {
          select: { id: true, businessName: true, verificationStatus: true },
        },
      },
    }),
  ]);

  return {
    total,
    page: query.page,
    limit: query.limit,
    data: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      contactNumber: user.contactNumber,
      isTraveller: user.isTraveller,
      isMerchant: user.isMerchant,
      isAdmin: user.isAdmin,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      merchantProfile: user.merchantProfile,
    })),
  };
};

export const suspendUser = async (id: string) => {
  return prisma.user.update({
    where: { id },
    data: { status: "suspended" },
    select: {
      id: true,
      name: true,
      email: true,
      contactNumber: true,
      isTraveller: true,
      isMerchant: true,
      isAdmin: true,
      status: true,
      createdAt: true,
    },
  });
};

export const activateUser = async (id: string) => {
  return prisma.user.update({
    where: { id },
    data: { status: "active" },
    select: {
      id: true,
      name: true,
      email: true,
      contactNumber: true,
      isTraveller: true,
      isMerchant: true,
      isAdmin: true,
      status: true,
      createdAt: true,
    },
  });
};

export const getUserDetails = async (id: string): Promise<AdminUserDetailsResponse> => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      merchantProfile: {
        select: { id: true, businessName: true, verificationStatus: true },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const [bookingsCount, locksCount, postsCount] = await Promise.all([
    prisma.booking.count({ where: { userId: id } }),
    prisma.dealLock.count({ where: { userId: id } }),
    prisma.communityPost.count({ where: { userId: id } }),
  ]);

  return {
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      contactNumber: user.contactNumber,
      isTraveller: user.isTraveller,
      isMerchant: user.isMerchant,
      isAdmin: user.isAdmin,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
      merchantProfile: user.merchantProfile,
    },
    bookingsCount,
    locksCount,
    postsCount,
  };
};

export const deleteCommunityPost = async (id: string) => {
  const post = await prisma.communityPost.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!post) {
    throw new Error("Post not found");
  }

  const [postMedia, commentsMedia] = await Promise.all([
    prisma.communityMedia.findMany({
      where: { postId: id },
      select: { url: true },
    }),
    prisma.communityMedia.findMany({
      where: { comment: { postId: id } },
      select: { url: true },
    }),
  ]);

  const allMediaUrls = [
    ...postMedia.map((media) => media.url),
    ...commentsMedia.map((media) => media.url),
  ];

  await deleteMediaFilesFromStorage(allMediaUrls);

  return prisma.communityPost.delete({ where: { id } });
};

export const deleteCommunityComment = async (id: string) => {
  const mediaUrls = await getCommentTreeMediaUrls(id);
  await deleteMediaFilesFromStorage(mediaUrls);

  return prisma.communityComment.delete({ where: { id } });
};

export const createDealRequest = async (
  userId: string,
  data: PublicDealRequestDto
) => {
  const dealRequest = (prisma as any).dealRequest;

  return dealRequest.create({
    data: {
      userId,
      message: data.message,
      contactNumber: data.contactNumber,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
};

export const listDealRequests = async (
  query: DealRequestListQueryDto
): Promise<PaginatedResponse<AdminDealRequestItem>> => {
  const skip = (query.page - 1) * query.limit;
  const dealRequest = (prisma as any).dealRequest;
  const where: any = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { message: { contains: query.search, mode: "insensitive" } },
            { contactNumber: { contains: query.search, mode: "insensitive" } },
            { user: { is: { name: { contains: query.search, mode: "insensitive" } } } },
            { user: { is: { email: { contains: query.search, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [total, items] = await Promise.all([
    dealRequest.count({ where }),
    dealRequest.findMany({
      where,
      skip,
      take: query.limit,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    total,
    page: query.page,
    limit: query.limit,
    data: items.map((item: any) => ({
      id: item.id,
      userId: item.userId,
      message: item.message,
      contactNumber: item.contactNumber,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      user: item.user,
    })),
  };
};

export const markDealRequestContacted = async (id: string) => {
  const dealRequest = (prisma as any).dealRequest;

  return dealRequest.update({
    where: { id },
    data: { status: "contacted" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};

export const markDealRequestClosed = async (id: string) => {
  const dealRequest = (prisma as any).dealRequest;

  return dealRequest.update({
    where: { id },
    data: { status: "closed" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
};
