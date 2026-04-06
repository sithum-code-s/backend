import { prisma } from "../../config/prisma";
import { IUpdateUserProfileDTO } from "./user-profile.types";

export const findUserById = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      contactNumber: true,
      address: true,
      city: true,
      country: true,
      createdAt: true,
    },
  });
};

export const updateUserById = async (userId: string, data: IUpdateUserProfileDTO) => {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      contactNumber: true,
      address: true,
      city: true,
      country: true,
      createdAt: true,
    },
  });
};
