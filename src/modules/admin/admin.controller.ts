import { Request, Response } from "express";
import * as service from "./admin.service";
import {
  merchantListQuerySchema,
  userListQuerySchema,
  dealRequestListQuerySchema,
  merchantIdSchema,
  userIdSchema,
  dealIdParamsSchema,
  displayPriceSchema,
} from "./admin.dto";

const parseOr400 = (schema: any, payload: unknown, res: Response) => {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    return null;
  }
  return parsed.data;
};

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const data = await service.getDashboard({ startDate, endDate });
    return res.json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to load dashboard" });
  }
};

export const getMerchants = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(merchantListQuerySchema, req.query, res);
    if (!parsed) return;
    const result = await service.listMerchants(parsed);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch merchants" });
  }
};

export const verifyMerchant = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(merchantIdSchema, req.params, res);
    if (!parsed) return;
    const merchant = await service.verifyMerchant(parsed.id);
    return res.json({ success: true, data: merchant });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to verify merchant" });
  }
};

export const unverifyMerchant = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(merchantIdSchema, req.params, res);
    if (!parsed) return;
    const merchant = await service.unverifyMerchant(parsed.id);
    return res.json({ success: true, data: merchant });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to update merchant" });
  }
};

export const getMerchantDetails = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(merchantIdSchema, req.params, res);
    if (!parsed) return;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const data = await service.getMerchantDetails(parsed.id, { startDate, endDate });
    return res.json({ success: true, data });
  } catch (error: any) {
    if (error.message === "Merchant not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message || "Failed to load merchant details" });
  }
};

export const updateDealDisplayPrice = async (req: Request, res: Response) => {
  try {
    const params = parseOr400(dealIdParamsSchema, req.params, res);
    if (!params) return;
    const body = parseOr400(displayPriceSchema, req.body, res);
    if (!body) return;
    const deal = await service.updateDealDisplayPrice(params.dealId, body.displayedPrice);
    return res.json({ success: true, data: deal });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to update deal display price" });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(userListQuerySchema, req.query, res);
    if (!parsed) return;
    const result = await service.listUsers(parsed);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch users" });
  }
};

export const suspendUser = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(userIdSchema, req.params, res);
    if (!parsed) return;
    const user = await service.suspendUser(parsed.id);
    return res.json({ success: true, data: user });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to suspend user" });
  }
};

export const activateUser = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(userIdSchema, req.params, res);
    if (!parsed) return;
    const user = await service.activateUser(parsed.id);
    return res.json({ success: true, data: user });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to activate user" });
  }
};

export const getUserDetails = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(userIdSchema, req.params, res);
    if (!parsed) return;
    const data = await service.getUserDetails(parsed.id);
    return res.json({ success: true, data });
  } catch (error: any) {
    if (error.message === "User not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message || "Failed to fetch user details" });
  }
};

export const deleteCommunityPost = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(userIdSchema, req.params, res);
    if (!parsed) return;
    await service.deleteCommunityPost(parsed.id);
    return res.status(204).send();
  } catch (error: any) {
    if (error.message === "Post not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message || "Failed to delete post" });
  }
};

export const deleteCommunityComment = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(userIdSchema, req.params, res);
    if (!parsed) return;
    await service.deleteCommunityComment(parsed.id);
    return res.status(204).send();
  } catch (error: any) {
    if (error.message === "Comment not found") {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message || "Failed to delete comment" });
  }
};

export const getDealRequests = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(dealRequestListQuerySchema, req.query, res);
    if (!parsed) return;
    const result = await service.listDealRequests(parsed);
    return res.json({ success: true, ...result });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to fetch deal requests" });
  }
};

export const contactedDealRequest = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(userIdSchema, req.params, res);
    if (!parsed) return;
    const result = await service.markDealRequestContacted(parsed.id);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to update request" });
  }
};

export const closedDealRequest = async (req: Request, res: Response) => {
  try {
    const parsed = parseOr400(userIdSchema, req.params, res);
    if (!parsed) return;
    const result = await service.markDealRequestClosed(parsed.id);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Failed to update request" });
  }
};
