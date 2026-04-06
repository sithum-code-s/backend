export enum PostCategory {
  RELAXATION = "RELAXATION",
  ADVENTURE = "ADVENTURE",
  DIVING = "DIVING",
  ROMANTIC = "ROMANTIC",
  LUXURY = "LUXURY",
  BUDGET = "BUDGET",
  FAMILY = "FAMILY",
  WILDLIFE = "WILDLIFE",
  CULTURE = "CULTURE",
  FOOD = "FOOD"
}

export const ALL_TAGS = [
  "scuba-diving",
  "snorkeling",
  "surfing",
  "jet-ski",
  "kayaking",
  "dolphin-watching",
  "sunset-cruise",

  "resort",
  "guesthouse",
  "water-villa",
  "beach-villa",

  "couple",
  "family",
  "solo",
  "friends",

  "relaxing",
  "adventure",
  "luxury",
  "romantic",

  "cheap",
  "premium",
  "discount",

  "beginner-diver",
  "advanced-diver",
  "reef-diving",
  "night-diving",

  "sunset",
  "full-day"
] as const;

export type PostTag = typeof ALL_TAGS[number];