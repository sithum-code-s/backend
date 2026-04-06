export interface IUpdateUserProfileDTO {
  name?: string;
  contactNumber?: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface IUserProfileResponse {
  id: string;
  name: string;
  email: string;
  contactNumber: string;
  address: string | null;
  city: string | null;
  country: string | null;
  createdAt: Date;
}
