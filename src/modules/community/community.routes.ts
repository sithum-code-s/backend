import { Router } from "express";
import * as controller from "./community.service";
import { verifyToken, optionalAuth } from "../../middleware/auth.middleware";

const router = Router();

// ─── Posts ───
router.get("/posts", optionalAuth, controller.getPosts);
router.post("/posts", verifyToken, controller.createPost);
router.get("/posts/:id", optionalAuth, controller.getPostById);
router.patch("/posts/:id", verifyToken, controller.updatePost);

// ─── Post Interactions ───
router.post("/posts/:id/like", verifyToken, controller.toggleLikePost);
router.delete("/posts/:id", verifyToken, controller.deletePost);

// ─── Comments ───
router.get("/posts/:id/comments", optionalAuth, controller.getCommentsForPost);
router.post("/posts/:id/comments", verifyToken, controller.createComment);
router.patch("/comments/:id", verifyToken, controller.updateComment);

// ─── Comment Interactions ───
router.post("/comments/:id/like", verifyToken, controller.toggleLikeComment);
router.delete("/comments/:id", verifyToken, controller.deleteComment);

export default router;
