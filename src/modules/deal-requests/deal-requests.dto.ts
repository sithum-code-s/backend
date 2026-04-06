import { z } from "zod";

export const createDealRequestSchema = z.object({
  message: z.string().min(10, "Please describe your request"),
  contactNumber: z.string().min(7, "Contact number is required"),
});

export type CreateDealRequestDto = z.infer<typeof createDealRequestSchema>;
