import { prisma } from "../../config/prisma";
import { IUpdateMerchantProfileDTO } from "./merchant-profile.types";

export const createMerchantProfile = async (userId: string, data: any) => {
  return prisma.merchantProfile.create({
    data: {
      userId,
      businessName: data.businessName,
      businessDescription: data.businessDescription,
      contactNumber: data.contactNumber,
      address: data.address ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
    },
  });
};

export const findMerchantProfileByUserId = async (userId: string) => {
  return prisma.merchantProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
};

export const updateMerchantProfileByUserId = async (
  userId: string,
  data: IUpdateMerchantProfileDTO
) => {
  return prisma.merchantProfile.update({
    where: { userId },
    data,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
};
