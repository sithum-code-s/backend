import type { UserStatus } from "./auth.enums";

//////////////////////////////////////////////////////
// BASE USER (Safe version — matches frontend IUser)
//////////////////////////////////////////////////////

export interface IUser {
  id: string;
  name: string;
  email: string;
  contactNumber?: string | null;

  isTraveller: boolean;
  isMerchant: boolean;
  isAdmin: boolean;

  status: UserStatus;

  createdAt: string;
}

//////////////////////////////////////////////////////
// MERCHANT PROFILE (matches frontend IMerchantProfile)
//////////////////////////////////////////////////////

export interface IMerchantProfile {
  id: string;
  userId: string;

  businessName: string;
  businessDescription: string;
  contactNumber: string;
  logoUrl?: string | null;

  address?: string | null;
  city?: string | null;
  country?: string | null;

  createdAt: string;
}

//////////////////////////////////////////////////////
// LOGIN RESPONSE — Enhanced with boolean flags for
// frontend redirect logic
//////////////////////////////////////////////////////

export interface ILoginResponse {
  message: string;
  user: IUser;
  isTraveller: boolean;
  isMerchant: boolean;
  isAdmin: boolean;
  hasPreferences: boolean;
  hasMerchantProfile: boolean;
}

//////////////////////////////////////////////////////
// REGISTER USER RESPONSE
//////////////////////////////////////////////////////

export interface IUserRegisterResponse {
  message: string;
  user: IUser;
}

//////////////////////////////////////////////////////
// REGISTER MERCHANT RESPONSE
//////////////////////////////////////////////////////

export interface IMerchantRegisterResponse {
  message: string;
  user: IUser;
}

//////////////////////////////////////////////////////
// ADD ROLE RESPONSE
//////////////////////////////////////////////////////

export interface IAddRoleResponse {
  message: string;
  user: IUser;
}