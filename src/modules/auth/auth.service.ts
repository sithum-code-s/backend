import { Request, Response } from "express";
import * as authRepository from "./auth.repository";
import {
  registerUserApiSchema,
  registerMerchantApiSchema,
  loginSchema,
  addRoleSchema,
} from "./auth.dtos";
import { AuthMessages } from "./auth.enums";
import { supabase } from "../../config/supabase";
import type { IUser } from "./auth.types";

//////////////////////////////////////////////////////
// HELPERS — Map Prisma models to response types
//////////////////////////////////////////////////////

const mapUserToResponse = (user: any): IUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  contactNumber: user.contactNumber ?? null,
  isTraveller: user.isTraveller,
  isMerchant: user.isMerchant,
  isAdmin: user.isAdmin,
  status: user.status,
  createdAt: user.createdAt.toISOString(),
});

//////////////////////////////////////////////////////
// HELPER — Set HTTP-Only Cookie
//////////////////////////////////////////////////////

const useCrossSiteCookies =
  process.env.NODE_ENV === "production" ||
  process.env.RENDER === "true" ||
  !!process.env.RENDER_EXTERNAL_URL;

const setTokenCookie = (res: Response, token: string) => {
  res.cookie("access_token", token, {
    httpOnly: true,
    secure: useCrossSiteCookies,
    sameSite: useCrossSiteCookies ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  });
};

//////////////////////////////////////////////////////
// POST /auth/login
// Returns boolean flags for frontend redirect logic:
//   isTraveller, isMerchant, isAdmin,
//   hasPreferences, hasMerchantProfile
//////////////////////////////////////////////////////

export const loginUser = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res
        .status(400)
        .json({ message: AuthMessages.TOKEN_REQUIRED });
    }

    const { token } = parsed.data;

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res
        .status(401)
        .json({ message: AuthMessages.INVALID_TOKEN });
    }

    // Find user with full profile (merchantProfile + preferences)
    const user = await authRepository.findUserWithFullProfile(
      data.user.id
    );

    if (!user) {
      return res
        .status(404)
        .json({ message: AuthMessages.USER_NOT_FOUND });
    }

    // Set HTTP-only cookie
    setTokenCookie(res, token);

    // Build response with boolean flags for redirect logic
    return res.json({
      message: AuthMessages.LOGIN_SUCCESS,
      user: mapUserToResponse(user),
      isTraveller: user.isTraveller,
      isMerchant: user.isMerchant,
      isAdmin: user.isAdmin,
      hasPreferences: !!user.preferences,
      hasMerchantProfile: !!user.merchantProfile,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: AuthMessages.LOGIN_FAILED });
  }
};

//////////////////////////////////////////////////////
// POST /auth/register/user
// Creates Supabase user (done by frontend) + DB row
// with isTraveller = true. No preferences yet.
//////////////////////////////////////////////////////

export const registerUser = async (req: Request, res: Response) => {
  try {
    const parsed = registerUserApiSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: AuthMessages.REGISTER_FAILED,
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    if (!data.supabaseUserId) {
      return res
        .status(400)
        .json({ message: AuthMessages.MISSING_SUPABASE_ID });
    }

    // Check if user already exists (cross-registration scenario)
    const existingUser = await authRepository.findUserById(
      data.supabaseUserId
    );

    if (existingUser) {
      // User already exists — just add traveller role
      if (existingUser.isTraveller) {
        return res.status(409).json({
          message: AuthMessages.ROLE_ALREADY_EXISTS,
        });
      }

      const updatedUser = await authRepository.addTravellerRole(
        existingUser.id
      );

      return res.json({
        message: AuthMessages.ROLE_ADDED,
        user: mapUserToResponse(updatedUser),
      });
    }

    const user = await authRepository.createUser(data);

    return res.json({
      message: AuthMessages.USER_CREATED,
      user: mapUserToResponse(user),
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: AuthMessages.REGISTER_FAILED,
      error: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// POST /auth/register/merchant
// Creates Supabase user (done by frontend) + DB row
// with isMerchant = true. No merchant profile yet.
//////////////////////////////////////////////////////

export const registerMerchant = async (req: Request, res: Response) => {
  try {
    const parsed = registerMerchantApiSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: AuthMessages.MERCHANT_REGISTER_FAILED,
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;

    if (!data.supabaseUserId) {
      return res
        .status(400)
        .json({ message: AuthMessages.MISSING_SUPABASE_ID });
    }

    // Check if user already exists (cross-registration scenario)
    const existingUser = await authRepository.findUserById(
      data.supabaseUserId
    );

    if (existingUser) {
      // User already exists — just add merchant role
      if (existingUser.isMerchant) {
        return res.status(409).json({
          message: AuthMessages.ROLE_ALREADY_EXISTS,
        });
      }

      const updatedUser = await authRepository.addMerchantRole(
        existingUser.id
      );

      return res.json({
        message: AuthMessages.ROLE_ADDED,
        user: mapUserToResponse(updatedUser),
      });
    }

    const user = await authRepository.createMerchantUser(data);

    return res.json({
      message: AuthMessages.MERCHANT_CREATED,
      user: mapUserToResponse(user),
    });
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: AuthMessages.MERCHANT_REGISTER_FAILED,
      error: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// POST /auth/add-role (Protected)
// For logged-in users to add a new role
// e.g., traveller wants to become merchant too
//////////////////////////////////////////////////////

export const addRole = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const parsed = addRoleSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: AuthMessages.ROLE_ADD_FAILED,
        errors: parsed.error.flatten().fieldErrors,
      });
    }

    const { role } = parsed.data;

    const user = await authRepository.findUserById(userId);

    if (!user) {
      return res
        .status(404)
        .json({ message: AuthMessages.USER_NOT_FOUND });
    }

    if (role === "traveller") {
      if (user.isTraveller) {
        return res
          .status(409)
          .json({ message: AuthMessages.ROLE_ALREADY_EXISTS });
      }
      const updatedUser = await authRepository.addTravellerRole(userId);
      return res.json({
        message: AuthMessages.ROLE_ADDED,
        user: mapUserToResponse(updatedUser),
      });
    }

    if (role === "merchant") {
      if (user.isMerchant) {
        return res
          .status(409)
          .json({ message: AuthMessages.ROLE_ALREADY_EXISTS });
      }
      const updatedUser = await authRepository.addMerchantRole(userId);
      return res.json({
        message: AuthMessages.ROLE_ADDED,
        user: mapUserToResponse(updatedUser),
      });
    }
  } catch (error: any) {
    console.error(error);
    return res.status(500).json({
      message: AuthMessages.ROLE_ADD_FAILED,
      error: error.message,
    });
  }
};

//////////////////////////////////////////////////////
// GET /auth/me
// Returns user with boolean flags for redirect
//////////////////////////////////////////////////////

export const getMe = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const user = await authRepository.findUserWithFullProfile(userId);

    if (!user) {
      return res
        .status(404)
        .json({ message: AuthMessages.USER_NOT_FOUND });
    }

    return res.json({
      user: mapUserToResponse(user),
      isTraveller: user.isTraveller,
      isMerchant: user.isMerchant,
      isAdmin: user.isAdmin,
      hasPreferences: !!user.preferences,
      hasMerchantProfile: !!user.merchantProfile,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: AuthMessages.FETCH_USER_FAILED });
  }
};

//////////////////////////////////////////////////////
// POST /auth/logout
//////////////////////////////////////////////////////

export const logoutUser = (_req: Request, res: Response) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: useCrossSiteCookies,
    sameSite: useCrossSiteCookies ? "none" : "lax",
  });

  return res.json({ message: AuthMessages.LOGOUT_SUCCESS });
};

//////////////////////////////////////////////////////
// POST /auth/refresh
//////////////////////////////////////////////////////

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res
        .status(400)
        .json({ message: AuthMessages.TOKEN_REQUIRED });
    }

    // Verify token with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res
        .status(401)
        .json({ message: AuthMessages.INVALID_TOKEN });
    }

    // Set new HTTP-only cookie
    setTokenCookie(res, token);

    return res.json({ message: AuthMessages.TOKEN_REFRESHED });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: AuthMessages.TOKEN_REFRESH_FAILED });
  }
};