import { z } from "zod";
import { PostCategory } from "./post.enum";

export const createPostSchema = z.object({
  content: z.string().min(1, "Content cannot be empty"),
  mediaUrls: z.array(z.string().url("Invalid media URL")).optional(),
  category: z.nativeEnum(PostCategory).nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const updatePostSchema = z.object({
  content: z.string().min(1, "Content cannot be empty").optional(),
  mediaUrls: z.array(z.string().url("Invalid media URL")).optional(),
});

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment content cannot be empty"),
  parentId: z.string().uuid("Invalid parent comment ID").optional(),
  mediaUrls: z.array(z.string().url("Invalid media URL")).optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, "Comment content cannot be empty").optional(),
  mediaUrls: z.array(z.string().url("Invalid media URL")).optional(),
});

export const paginationQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).optional().default(0),
  take: z.coerce.number().int().min(1).max(50).optional().default(10),
});
