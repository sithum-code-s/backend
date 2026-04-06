import { Request, Response, NextFunction } from "express";
import * as repository from "./community.repository";
import { CreatePostDTO, CreateCommentDTO } from "./community.types";
import { createPostSchema, createCommentSchema, paginationQuerySchema, updatePostSchema, updateCommentSchema } from "./community.schema";
import { categorizePost } from "./ai.service";
import { supabase } from "../../config/supabase";

// ─── Supabase Storage Cleanup ───

/**
 * Extracts file paths from Supabase Storage URLs and deletes them from the bucket.
 * URLs are expected in format: https://{project}.supabase.co/storage/v1/object/public/tourist-image/{path}
 */
const deleteMediaFilesFromStorage = async (mediaUrls: string[]): Promise<void> => {
  if (!mediaUrls.length) return;

  const filePaths = mediaUrls
    .map((url) => {
      try {
        // Extract path after /tourist-image/
        const match = url.match(/\/tourist-image\/(.+)$/);
        return match ? match[1] : null;
      } catch {
        return null;
      }
    })
    .filter((path): path is string => path !== null);

  if (!filePaths.length) return;

  try {
    const { error } = await supabase.storage
      .from("tourist-image")
      .remove(filePaths);

    if (error) {
      console.error("Error deleting media files from Supabase:", error.message);
      // Don't throw - allow DB deletion to proceed even if storage cleanup fails
    }
  } catch (error) {
    console.error("Exception while deleting media files:", error);
    // Don't throw - allow DB deletion to proceed
  }
};

// ─── Post Services ───

export const createPostService = async (userId: string, data: CreatePostDTO) => {
  let aiData: { category: string | null; tags: string[] } = {
    category: null,
    tags: []
  };

  try {
    aiData = await categorizePost(data.content);
  } catch (err) {
    console.error("AI failed, continuing without it");
  }

  return await repository.createPost(userId, {
    ...data,
    category: aiData.category,
    tags: aiData.tags
  });
};

const getPostsService = async (skip: number, take: number, userId?: string) => {
  const result = await repository.getPosts(skip, take, userId);
  return {
    ...result,
    data: result.data.map((post: any) => ({
      ...post,
      category: post.category ?? null,
      tags: Array.isArray(post.tags) ? post.tags : [],
    })),
  };
};

const getPostByIdService = async (id: string, userId?: string) => {
  const post = await repository.getPostById(id, userId);
  if (!post) throw new Error("Post not found");
  return {
    ...post,
    category: post.category ?? null,
    tags: Array.isArray((post as any).tags) ? (post as any).tags : [],
  };
};

const toggleLikePostService = async (userId: string, postId: string) => {
  // Ensure post exists
  await getPostByIdService(postId);
  return await repository.toggleLikePost(userId, postId);
};

const deletePostService = async (userId: string, postId: string) => {
  const post = await repository.getPostById(postId);
  if (!post) throw new Error("Post not found");
  if (post.userId !== userId) throw new Error("Unauthorized");

  // ✅ Fetch all media associated with this POST
  const postMedia = await repository.getPostMedia(postId);
  const postMediaUrls = postMedia.map((m: any) => m.url);

  // ✅ Fetch all media associated with COMMENTS on this post
  const commentsMedia = await repository.getAllCommentsMediaByPostId(postId);
  const commentsMediaUrls = commentsMedia.map((m: any) => m.url);

  // ✅ Combine all media URLs
  const allMediaUrls = [...postMediaUrls, ...commentsMediaUrls];

  // ✅ Delete ALL files from Supabase Storage (post images + comment images)
  await deleteMediaFilesFromStorage(allMediaUrls);

  // ✅ Then delete from database (CASCADE will handle all media deletion)
  return await repository.deletePost(postId);
};

// ─── Comment Services ───

const createCommentService = async (userId: string, postId: string, data: CreateCommentDTO) => {
  // Verify post exists
  await getPostByIdService(postId);
  
  if (data.parentId) {
    // Ideally verify parent comment exists and belongs to the same post
    // But keeping it simple for now, DB constraints usually catch bad foreign keys.
  }

  return await repository.createComment(userId, postId, data);
};

const getCommentsByPostIdService = async (postId: string, skip: number, take: number, userId?: string) => {
  return await repository.getCommentsByPostId(postId, skip, take, userId);
};

const toggleLikeCommentService = async (userId: string, commentId: string) => {
  return await repository.toggleLikeComment(userId, commentId);
};

const deleteCommentService = async (userId: string, commentId: string) => {
  const comment = await repository.getCommentById(commentId);
  if (!comment) throw new Error("Comment not found");
  if (comment.userId !== userId) throw new Error("Unauthorized");

  // Fetch all media associated with this comment
  const media = await repository.getCommentMedia(commentId);
  const mediaUrls = media.map((m: any) => m.url);

  // Delete files from Supabase Storage
  await deleteMediaFilesFromStorage(mediaUrls);

  // Then delete from database (CASCADE will handle media deletion)
  return await repository.deleteComment(commentId);
};

const updatePostService = async (userId: string, postId: string, data: { content?: string; mediaUrls?: string[] }) => {
  const post = await repository.getPostById(postId);
  if (!post) throw new Error("Post not found");
  if (post.userId !== userId) throw new Error("Unauthorized");

  // Handle media updates if provided
  if (data.mediaUrls !== undefined) {
    const currentMedia = await repository.getPostMedia(postId);
    const currentUrls = currentMedia.map((m: any) => m.url);
    
    // Find media to delete (in current but not in new list)
    const urlsToDelete = currentUrls.filter(url => !data.mediaUrls?.includes(url));
    
    // Find media to add (in new list but not in current)
    const urlsToAdd = (data.mediaUrls || []).filter(url => !currentUrls.includes(url));

    // Delete old files from Supabase
    if (urlsToDelete.length > 0) {
      await deleteMediaFilesFromStorage(urlsToDelete);
      // Delete from database
      await repository.deleteMediaByUrl(urlsToDelete);
    }

    // Add new media to database
    if (urlsToAdd.length > 0) {
      await repository.addMediaToPost(postId, urlsToAdd);
    }
  }

  // Update post content
  if (data.content !== undefined) {
    return await repository.updatePost(postId, { content: data.content });
  }

  // If only media was updated, fetch and return updated post
  return await repository.getPostById(postId);
};

const updateCommentService = async (userId: string, commentId: string, data: { content?: string; mediaUrls?: string[] }) => {
  const comment = await repository.getCommentById(commentId);
  if (!comment) throw new Error("Comment not found");
  if (comment.userId !== userId) throw new Error("Unauthorized");

  // Handle media updates if provided
  if (data.mediaUrls !== undefined) {
    const currentMedia = await repository.getCommentMedia(commentId);
    const currentUrls = currentMedia.map((m: any) => m.url);
    
    // Find media to delete (in current but not in new list)
    const urlsToDelete = currentUrls.filter(url => !data.mediaUrls?.includes(url));
    
    // Find media to add (in new list but not in current)
    const urlsToAdd = (data.mediaUrls || []).filter(url => !currentUrls.includes(url));

    // Delete old files from Supabase
    if (urlsToDelete.length > 0) {
      await deleteMediaFilesFromStorage(urlsToDelete);
      // Delete from database
      await repository.deleteMediaByUrl(urlsToDelete);
    }

    // Add new media to database
    if (urlsToAdd.length > 0) {
      await repository.addMediaToComment(commentId, urlsToAdd);
    }
  }

  // Update comment content
  if (data.content !== undefined) {
    return await repository.updateComment(commentId, { content: data.content });
  }

  // If only media was updated, fetch and return updated comment
  return await repository.getCommentById(commentId);
};

export const createPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const body = createPostSchema.parse(req.body);
    const post = await createPostService(userId, body);
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

export const getPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const query = paginationQuerySchema.parse(req.query);
    const result = await getPostsService(query.skip, query.take, userId);
    res.status(200).json({ success: true, data: result.data, total: result.total });
  } catch (error) {
    next(error);
  }
};

export const getPostById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).userId;
    const post = await getPostByIdService(id, userId);
    res.status(200).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

export const toggleLikePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).userId;
    const result = await toggleLikePostService(userId, id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const deletePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).userId;
    await deletePostService(userId, id);
    res.status(200).json({ success: true, message: "Post deleted" });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const createComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postId = req.params.id as string;
    const userId = (req as any).userId;
    const body = createCommentSchema.parse(req.body);
    const comment = await createCommentService(userId, postId, body);
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    next(error);
  }
};

export const getCommentsForPost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const postId = req.params.id as string;
    const userId = (req as any).userId;
    const query = paginationQuerySchema.parse(req.query);
    const result = await getCommentsByPostIdService(postId, query.skip, query.take, userId);
    res.status(200).json({ success: true, data: result.data, total: result.total });
  } catch (error) {
    next(error);
  }
};

export const toggleLikeComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id as string;
    const userId = (req as any).userId;
    const result = await toggleLikeCommentService(userId, commentId);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).userId;
    await deleteCommentService(userId, id);
    res.status(200).json({ success: true, message: "Comment deleted" });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

// ─── Update Endpoints ───

export const updatePost = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).userId;
    const body = updatePostSchema.parse(req.body);
    const post = await updatePostService(userId, id, body);
    res.status(200).json({ success: true, data: post });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};

export const updateComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const userId = (req as any).userId;
    const body = updateCommentSchema.parse(req.body);
    const comment = await updateCommentService(userId, id, body);
    res.status(200).json({ success: true, data: comment });
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    next(error);
  }
};
