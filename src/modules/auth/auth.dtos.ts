import { z } from "zod";

//////////////////////////////////////////////////////
// COMMON FIELDS (Reusable)
//////////////////////////////////////////////////////

export const emailField = z.string().email("Invalid email");

export const nameField = z.string().min(1).max(100);

//////////////////////////////////////////////////////
// LOGIN
//////////////////////////////////////////////////////

export const loginSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type LoginDto = z.infer<typeof loginSchema>;

//////////////////////////////////////////////////////
// REGISTER USER — API DTO (received from frontend)
// password is already removed by frontend
// supabaseUserId is added by frontend
//////////////////////////////////////////////////////

export const registerUserApiSchema = z.object({
  name: nameField,
  email: emailField,
  supabaseUserId: z.string().min(1, "Supabase user ID is required"),
});

export type RegisterUserApiDto = z.infer<typeof registerUserApiSchema>;

//////////////////////////////////////////////////////
// REGISTER MERCHANT — API DTO (received from frontend)
// Only basic user info — no business fields at registration
// Merchant profile is created during onboarding
//////////////////////////////////////////////////////

export const registerMerchantApiSchema = z.object({
  name: nameField,
  email: emailField,
  supabaseUserId: z.string().min(1, "Supabase user ID is required"),
});

export type RegisterMerchantApiDto = z.infer<typeof registerMerchantApiSchema>;

//////////////////////////////////////////////////////
// ADD ROLE — For cross-registration
// (existing user wants to add traveller or merchant role)
//////////////////////////////////////////////////////

export const addRoleSchema = z.object({
  role: z.enum(["traveller", "merchant"]),
});

export type AddRoleDto = z.infer<typeof addRoleSchema>;