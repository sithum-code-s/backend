import { z } from "zod";

export const generateItinerarySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  durationDays: z.number().int().min(1, "durationDays must be at least 1"),
  generationDay: z.number().int().min(1, "generationDay must be at least 1").optional(),
  previousItineraries: z
    .array(
      z.object({
        dayNumber: z.number().int().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .optional(),
  futureItineraries: z
    .array(
      z.object({
        dayNumber: z.number().int().min(1),
        title: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .optional(),
  travelerType: z.string().min(1, "travelerType is required"),
  travelStyle: z.string().min(1, "travelStyle is required"),
  accommodationLevel: z.string().min(1, "accommodationLevel is required"),
  highlights: z.string().min(1, "highlights is required"),
  pace: z.enum(["relaxed", "balanced", "packed"]),
  notes: z.string().optional(),
});

export type GenerateItineraryDto = z.infer<typeof generateItinerarySchema>;

export const generateAddOnsSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  durationDays: z.number().int().min(1, "durationDays must be at least 1"),
  dealPrice: z.number().min(0).optional(),
  displayedPrice: z.number().min(0).optional(),
  itineraries: z
    .array(
      z.object({
        dayNumber: z.number().int().min(1),
        title: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .min(1, "itineraries are required")
    .optional(),
  notes: z.string().optional(),
});

export type GenerateAddOnsDto = z.infer<typeof generateAddOnsSchema>;
