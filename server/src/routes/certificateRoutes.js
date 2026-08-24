import express from "express";
import {
  bulkCreateCertificates,
  createCertificate,
  deleteCertificate,
  getCertificateById,
  getCertificateEmailStatus,
  getCertificates,
  retryCertificateEmail,
  saveDraftCertificate,
  sendAllCertificateEmails,
  sendCertificateEmailController,
  updateCertificate
} from "../controllers/certificateController.js";
import validateObjectId from "../middleware/validateObjectId.js";

const router = express.Router();

router.param("id", validateObjectId);

// Collection & specific operational routes (Must precede /:id)
router.get("/email-status", getCertificateEmailStatus);
router.post("/send-all-email", sendAllCertificateEmails);
router.post("/draft", saveDraftCertificate);
router.post("/bulk", bulkCreateCertificates);
router.post("/", createCertificate);
router.get("/", getCertificates);

// Resource /:id routes
router.get("/:id", getCertificateById);
router.put("/:id", updateCertificate);
router.delete("/:id", deleteCertificate);
router.post("/:id/send-email", sendCertificateEmailController);
router.post("/:id/retry-email", retryCertificateEmail);

export default router;
