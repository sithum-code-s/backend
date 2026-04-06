export type MerchantVerificationFilter = "pending" | "verified";
export type DealRequestStatus = "new" | "contacted" | "closed";

export interface PlatformIncomePoint {
  date: string;
  income: number;
}

export interface AdminDashboardResponse {
  totalUsers: number;
  totalMerchants: number;
  totalDeals: number;
  totalBookings: number;
  totalLocks: number;
  totalPlatformRevenue: number;
  platformIncomeSeries: PlatformIncomePoint[];
}

export interface AdminMerchantListItem {
  id: string;
  userId: string;
  businessName: string;
  businessDescription: string;
  contactNumber: string | null;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  verificationStatus: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    deals: number;
  };
}

export interface MerchantDealSummary {
  dealId: string;
  title: string | null;
  displayedPrice: number | null;
  locksCount: number;
  bookingsCount: number;
}

export interface MerchantDetailsResponse {
  merchant: {
    id: string;
    userId: string;
    businessName: string;
    businessDescription: string;
    contactNumber: string | null;
    logoUrl: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    verificationStatus: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  };
  analytics: {
    totalDeals: number;
    totalLocks: number;
    totalBookings: number;
    totalRevenueGenerated: number;
    platformCommission: number;
    merchantPayout: number;
  };
  deals: MerchantDealSummary[];
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  contactNumber: string | null;
  isTraveller: boolean;
  isMerchant: boolean;
  isAdmin: boolean;
  status: string;
  createdAt: string;
  merchantProfile?: {
    id: string;
    businessName: string;
    verificationStatus: string;
  } | null;
}

export interface AdminUserDetailsResponse {
  profile: AdminUserListItem;
  bookingsCount: number;
  locksCount: number;
  postsCount: number;
}

export interface AdminDealRequestItem {
  id: string;
  userId: string;
  message: string;
  contactNumber: string | null;
  status: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
