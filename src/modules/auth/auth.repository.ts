import { prisma } from "../../config/prisma";
import type { RegisterUserApiDto, RegisterMerchantApiDto } from "./auth.dtos";

//////////////////////////////////////////////////////
// CREATE USER (Normal Traveller)
// Only sets isTraveller = true
//////////////////////////////////////////////////////

export const createUser = async (data: RegisterUserApiDto) => {
  return prisma.user.create({
    data: {
      id: data.supabaseUserId,
      name: data.name,
      email: data.email,
      isTraveller: true,
      isMerchant: false,
      isAdmin: false,
    },
  });
};

//////////////////////////////////////////////////////
// CREATE MERCHANT USER
// Only sets isMerchant = true
//////////////////////////////////////////////////////

export const createMerchantUser = async (data: RegisterMerchantApiDto) => {
  return prisma.user.create({
    data: {
      id: data.supabaseUserId,
      name: data.name,
      email: data.email,
      isTraveller: false,
      isMerchant: true,
      isAdmin: false,
    },
  });
};

//////////////////////////////////////////////////////
// FIND USER BY ID
//////////////////////////////////////////////////////

export const findUserById = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
  });
};

//////////////////////////////////////////////////////
// FIND USER BY EMAIL
//////////////////////////////////////////////////////

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

//////////////////////////////////////////////////////
// FIND USER WITH FULL PROFILE DATA
// Includes merchantProfile and preferences for
// determining redirect flags
//////////////////////////////////////////////////////

export const findUserWithFullProfile = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      merchantProfile: true,
      preferences: true,
    },
  });
};

//////////////////////////////////////////////////////
// ADD ROLE TO EXISTING USER
// Used for cross-registration
//////////////////////////////////////////////////////

export const addTravellerRole = async (userId: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { isTraveller: true },
  });
};

export const addMerchantRole = async (userId: string) => {
  return prisma.user.update({
    where: { id: userId },
    data: { isMerchant: true },
  });
};
