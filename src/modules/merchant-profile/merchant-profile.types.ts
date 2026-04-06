export interface IUpdateMerchantProfileDTO {
  businessName?: string;
  businessDescription?: string;
  contactNumber?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface IMerchantProfileResponse {
  id: string;
  userId: string;
  businessName: string;
  businessDescription: string;
  verificationStatus: 'pending' | 'verified';
  contactNumber: string;
  address: string | null;
  city: string | null;
  country: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    name: string;
    email: string;
  };
}
