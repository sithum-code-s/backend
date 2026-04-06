import { z } from "zod";
import { createPostSchema, createCommentSchema, paginationQuerySchema } from "./community.schema";

export type CreatePostDTO = z.infer<typeof createPostSchema>;
export type CreateCommentDTO = z.infer<typeof createCommentSchema>;
export type PaginationQueryDTO = z.infer<typeof paginationQuerySchema>;
