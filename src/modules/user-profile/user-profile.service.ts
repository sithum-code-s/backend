import * as repo from "./user-profile.repository";
import { IUpdateUserProfileDTO } from "./user-profile.types";

export const getUserProfile = async (userId: string) => {
  const user = await repo.findUserById(userId);
  if (!user) throw { status: 404, message: "User not found" };
  return user;
};

export const updateUserProfile = async (userId: string, data: IUpdateUserProfileDTO) => {
  const user = await repo.findUserById(userId);
  if (!user) throw { status: 404, message: "User not found" };

  return repo.updateUserById(userId, data);
};
