import { prisma } from "../../config/prisma";

//////////////////////////////////////////////////////
// CREATE USER PREFERENCES
//////////////////////////////////////////////////////

export const createUserPreference = async (userId: string, data: any) => {
  return prisma.userPreference.create({
    data: {
      userId,
      travelStyle: data.travelStyle ?? null,
      budgetMin: data.budgetMin ?? null,
      budgetMax: data.budgetMax ?? null,
      preferredLocations: data.preferredLocations ?? null,
      accommodationTypes: data.accommodationTypes ?? null,
      activityInterests: data.activityInterests ?? null,
      tripDuration: data.tripDuration ?? null,
      travelGroupType: data.travelGroupType ?? null,
      transportPreference: data.transportPreference ?? null,
      diverLevel: data.diverLevel ?? null,
    },
  });
};

//////////////////////////////////////////////////////
// FIND USER PREFERENCES
//////////////////////////////////////////////////////

export const findUserPreference = async (userId: string) => {
  return prisma.userPreference.findUnique({
    where: { userId },
  });
};

//////////////////////////////////////////////////////
// UPDATE USER PREFERENCES
//////////////////////////////////////////////////////

export const updateUserPreference = async (userId: string, data: any) => {
  return prisma.userPreference.update({
    where: { userId },
    data: {
      travelStyle: data.travelStyle ?? undefined,
      budgetMin: data.budgetMin ?? undefined,
      budgetMax: data.budgetMax ?? undefined,
      preferredLocations: data.preferredLocations ?? undefined,
      accommodationTypes: data.accommodationTypes ?? undefined,
      activityInterests: data.activityInterests ?? undefined,
      tripDuration: data.tripDuration ?? undefined,
      travelGroupType: data.travelGroupType ?? undefined,
      transportPreference: data.transportPreference ?? undefined,
      diverLevel: data.diverLevel ?? undefined,
    },
  });
};
