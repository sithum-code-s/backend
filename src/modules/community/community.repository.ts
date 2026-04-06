import { prisma } from "../../config/prisma";
import { CreatePostDTO, CreateCommentDTO } from "./community.types";

export const createPost = async (userId: string, data: any) => {
  return prisma.communityPost.create({
    data: {
      userId,
      content: data.content,
      category: data.category,
      tags: data.tags,

      media: data.mediaUrls?.length
        ? {
            create: data.mediaUrls.map((url: string) => ({ url })),
          }
        : undefined,
    },
    include: {
      media: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });
};

export const getPosts = async (skip: number, take: number, currentUserId?: string) => {
  const posts = await prisma.communityPost.findMany({
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      media: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
      ...(currentUserId ? {
        likes: {
          where: { userId: currentUserId },
          select: { id: true },
        },
      } : {}),
    },
  });
  
  const total = await prisma.communityPost.count();
  
  return { data: posts, total };
};

export const getPostById = async (id: string, currentUserId?: string) => {
  return prisma.communityPost.findUnique({
    where: { id },
    include: {
      media: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
      ...(currentUserId ? {
        likes: {
          where: { userId: currentUserId },
          select: { id: true },
        },
      } : {}),
    },
  });
};

export const toggleLikePost = async (userId: string, postId: string) => {
  const existingLike = await prisma.communityLike.findUnique({
    where: {
      userId_postId_commentId: {
        userId,
        postId,
        commentId: "",
      },
    },
  });

  // Prisma unique constraint on userId, postId, commentId where nullable commentId handles it uniquely.
  // Wait, if commentId is null, how do we query it? Let's check schema.prisma: `@@unique([userId, postId, commentId])`
  // Actually, querying with null might not work directly in findUnique in Prisma depending on versions...
  // Let's use findFirst
  const like = await prisma.communityLike.findFirst({
    where: {
      userId,
      postId,
      commentId: null,
    },
  });

  if (like) {
    await prisma.communityLike.delete({ where: { id: like.id } });
    return { liked: false };
  } else {
    await prisma.communityLike.create({
      data: {
        userId,
        postId,
      },
    });
    return { liked: true };
  }
};

export const createComment = async (userId: string, postId: string, data: CreateCommentDTO) => {
  return prisma.communityComment.create({
    data: {
      userId,
      postId,
      content: data.content,
      parentId: data.parentId || null,
      media: data.mediaUrls && data.mediaUrls.length > 0 ? {
        create: data.mediaUrls.map((url) => ({ url })),
      } : undefined,
    },
    include: {
      media: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
    },
  });
};

export const getCommentsByPostId = async (postId: string, skip: number, take: number, currentUserId?: string) => {
  // Get top-level comments
  const comments = await prisma.communityComment.findMany({
    where: { 
      postId,
      parentId: null 
    },
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: {
      media: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
      ...(currentUserId ? {
        likes: {
          where: { userId: currentUserId },
          select: { id: true },
        },
      } : {}),
      // nested replies up to 1 level for simplicity, but maybe just let frontend fetch them lazily
    },
  });
  
  const total = await prisma.communityComment.count({
    where: {
      postId,
      parentId: null
    }
  });
  
  return { data: comments, total };
};

export const toggleLikeComment = async (userId: string, commentId: string) => {
  const like = await prisma.communityLike.findFirst({
    where: {
      userId,
      commentId,
      postId: null,
    },
  });

  if (like) {
    await prisma.communityLike.delete({ where: { id: like.id } });
    return { liked: false };
  } else {
    await prisma.communityLike.create({
      data: {
        userId,
        commentId,
      },
    });
    return { liked: true };
  }
};

export const getPostMedia = async (postId: string) => {
  return prisma.communityMedia.findMany({
    where: { postId },
  });
};

export const updatePost = async (id: string, data: { content: string }) => {
  return prisma.communityPost.update({
    where: { id },
    data,
    include: {
      media: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });
};

export const deletePost = async (id: string) => {
  return prisma.communityPost.delete({ where: { id } });
};

export const getCommentById = async (id: string) => {
  return prisma.communityComment.findUnique({ where: { id } });
};

export const getCommentMedia = async (commentId: string) => {
  return prisma.communityMedia.findMany({
    where: { commentId },
  });
};

export const updateComment = async (id: string, data: { content: string }) => {
  return prisma.communityComment.update({
    where: { id },
    data,
    include: {
      media: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          likes: true,
          replies: true,
        },
      },
    },
  });
};

export const deleteComment = async (id: string) => {
  return prisma.communityComment.delete({ where: { id } });
};

export const deleteMediaByUrl = async (urls: string[]) => {
  return prisma.communityMedia.deleteMany({
    where: {
      url: {
        in: urls,
      },
    },
  });
};

export const addMediaToPost = async (postId: string, mediaUrls: string[]) => {
  return prisma.communityMedia.createMany({
    data: mediaUrls.map((url) => ({
      url,
      postId,
    })),
  });
};

export const addMediaToComment = async (commentId: string, mediaUrls: string[]) => {
  return prisma.communityMedia.createMany({
    data: mediaUrls.map((url) => ({
      url,
      commentId,
    })),
  });
};

// Get all comments' media for a post (used for bulk deletion cleanup)
export const getAllCommentsMediaByPostId = async (postId: string) => {
  const comments = await prisma.communityComment.findMany({
    where: { postId },
    include: {
      media: true,
    },
  });
  
  // Flatten array of media from all comments
  const allMedia = comments.flatMap((comment) => comment.media);
  return allMedia;
};
