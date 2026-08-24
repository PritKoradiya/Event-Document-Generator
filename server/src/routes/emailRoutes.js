import express from "express";
import { getEmailHealth } from "../controllers/emailController.js";

const router = express.Router();

// GET /api/email/health
router.get("/health", getEmailHealth);

export default router;
