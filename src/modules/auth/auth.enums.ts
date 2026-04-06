//////////////////////////////////////////////////////
// AUTH ENUMS
//////////////////////////////////////////////////////

/**
 * Maps to Prisma UserStatus enum values
 */
export type UserStatus = "active" | "suspended";

//////////////////////////////////////////////////////
// AUTH MESSAGES
//////////////////////////////////////////////////////

export enum AuthMessages {
  USER_CREATED = "User registered successfully",
  MERCHANT_CREATED = "Merchant registered successfully",
  ROLE_ADDED = "Role added successfully",
  LOGIN_SUCCESS = "Login successful",
  LOGOUT_SUCCESS = "Logged out",
  TOKEN_REFRESHED = "Token refreshed",
  USER_NOT_FOUND = "User not found",
  LOGIN_FAILED = "Login failed",
  REGISTER_FAILED = "Registration failed",
  MERCHANT_REGISTER_FAILED = "Merchant registration failed",
  ROLE_ADD_FAILED = "Failed to add role",
  ROLE_ALREADY_EXISTS = "User already has this role",
  TOKEN_REQUIRED = "Token required",
  INVALID_TOKEN = "Invalid token",
  MISSING_SUPABASE_ID = "Missing Supabase user ID",
  FETCH_USER_FAILED = "Failed to fetch user",
  TOKEN_REFRESH_FAILED = "Token refresh failed",
}