import express from "express";
import {
  bulkCreateCertificates,
  createCertificate,
  deleteCertificate,
  getCertificateById,
  getCertificates,
  saveDraftCertificate,
  updateCertificate
} from "../controllers/certificateController.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

router.param("id", validateObjectId);

router.post("/draft", saveDraftCertificate);
router.post("/bulk", bulkCreateCertificates);
router.post("/", createCertificate);
router.get("/", getCertificates);
router.get("/:id", getCertificateById);
router.put("/:id", updateCertificate);
router.delete("/:id", deleteCertificate);

export default router;
