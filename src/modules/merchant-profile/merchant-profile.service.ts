import * as repo from "./merchant-profile.repository";
import { IUpdateMerchantProfileDTO } from "./merchant-profile.types";

export const createMerchantProfile = async (userId: string, data: any) => {
  const existing = await repo.findMerchantProfileByUserId(userId);
  if (existing) {
    throw { status: 409, message: "Merchant profile already exists" };
  }

  if (!data.businessName || !data.businessDescription || !data.contactNumber) {
    throw { status: 400, message: "Business name, description, and contact number are required" };
  }

  return repo.createMerchantProfile(userId, data);
};

export const getMerchantProfile = async (userId: string) => {
  const profile = await repo.findMerchantProfileByUserId(userId);
  if (!profile) {
    throw { status: 404, message: "No merchant profile found" };
  }
  return profile;
};

export const updateMerchantProfile = async (userId: string, data: IUpdateMerchantProfileDTO) => {
  const profile = await repo.findMerchantProfileByUserId(userId);
  if (!profile) {
    throw { status: 404, message: "No merchant profile found" };
  }

  // Ensure email is not in DTO if frontend sends it, or just partial update
  // The DTO doesn't have email anyway.

  return repo.updateMerchantProfileByUserId(userId, data);
};
