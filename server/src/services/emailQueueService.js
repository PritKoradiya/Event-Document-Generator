import Certificate from "../models/Certificate.js";
import { isEmailConfigured } from "../config/email.js";
import { sendCertificateEmail, generateCertificateEmailContent } from "./emailService.js";
import { isValidEmail } from "../utils/validateEmail.js";

const MAX_CONCURRENCY = 2;

class EmailQueueService {
  constructor() {
    this.queue = [];
    this.processing = new Set();
    this.concurrency = MAX_CONCURRENCY;
    this.stats = {
      totalQueued: 0,
      totalProcessed: 0,
      totalFailed: 0
    };
  }

  /**
   * Updates a certificate's email status to "queued".
   */
  async markEmailQueued(certificateId) {
    return Certificate.findOneAndUpdate(
      { $or: [{ _id: certificateId }, { certificateId }] },
      {
        $set: {
          emailStatus: "queued",
          emailLastError: ""
        }
      },
      { new: true }
    );
  }

  /**
   * Updates a certificate's email status to "sending".
   */
  async markEmailSending(certificateId) {
    return Certificate.findOneAndUpdate(
      { $or: [{ _id: certificateId }, { certificateId }] },
      {
        $set: {
          emailStatus: "sending"
        }
      },
      { new: true }
    );
  }

  /**
   * Updates a certificate's email status to "sent" on successful delivery.
   */
  async markEmailSent(certificateId, messageId = "") {
    return Certificate.findOneAndUpdate(
      { $or: [{ _id: certificateId }, { certificateId }] },
      {
        $set: {
          emailStatus: "sent",
          emailSentAt: new Date(),
          emailLastError: ""
        },
        $inc: { emailSendAttempts: 1 }
      },
      { new: true }
    );
  }

  /**
   * Updates a certificate's email status to "failed" on error.
   */
  async markEmailFailed(certificateId, errorMessage = "Email dispatch failed") {
    // Sanitize error message so credentials are never saved
    const safeError = String(errorMessage || "Failed to send email")
      .replace(/password=[^&\s]+/gi, "password=***")
      .replace(/pass=[^&\s]+/gi, "pass=***")
      .slice(0, 500);

    return Certificate.findOneAndUpdate(
      { $or: [{ _id: certificateId }, { certificateId }] },
      {
        $set: {
          emailStatus: "failed",
          emailLastError: safeError
        },
        $inc: { emailSendAttempts: 1 }
      },
      { new: true }
    );
  }

  /**
   * Enqueues a single certificate ID for email dispatch.
   *
   * @param {string} certificateId
   * @returns {Promise<Object>}
   */
  async queueCertificateEmail(certificateId) {
    if (!certificateId) {
      throw new Error("Certificate ID is required to queue email.");
    }

    const cert = await this.markEmailQueued(certificateId);
    if (!cert) {
      throw new Error("Certificate not found.");
    }

    const key = cert._id.toString();
    if (!this.queue.includes(key) && !this.processing.has(key)) {
      this.queue.push(key);
      this.stats.totalQueued += 1;
    }

    // Trigger queue runner asynchronously
    this.processQueue();

    return {
      success: true,
      certificateId: cert.certificateId || cert._id,
      emailStatus: "queued"
    };
  }

  /**
   * Enqueues multiple certificate IDs in bulk for controlled sequential email sending.
   *
   * @param {Array<string>} certificateIds
   * @returns {Promise<Object>}
   */
  async queueManyCertificateEmails(certificateIds = []) {
    if (!Array.isArray(certificateIds) || certificateIds.length === 0) {
      throw new Error("certificateIds must be a non-empty array.");
    }

    if (certificateIds.length > 500) {
      const error = new Error("Maximum 500 certificates can be queued for email sending.");
      error.statusCode = 400;
      throw error;
    }

    // Find existing certificates matching given IDs
    const certificates = await Certificate.find({
      $or: [{ _id: { $in: certificateIds } }, { certificateId: { $in: certificateIds } }]
    });

    if (certificates.length === 0) {
      return {
        success: true,
        count: 0,
        queuedIds: []
      };
    }

    const matchedIds = certificates.map((c) => c._id);

    // Update status in database in bulk
    await Certificate.updateMany(
      { _id: { $in: matchedIds } },
      {
        $set: {
          emailStatus: "queued",
          emailLastError: ""
        }
      }
    );

    let enqueuedCount = 0;
    for (const cert of certificates) {
      const key = cert._id.toString();
      if (!this.queue.includes(key) && !this.processing.has(key)) {
        this.queue.push(key);
        this.stats.totalQueued += 1;
        enqueuedCount += 1;
      }
    }

    // Trigger queue runner asynchronously
    this.processQueue();

    return {
      success: true,
      count: enqueuedCount,
      totalMatched: certificates.length
    };
  }

  /**
   * Returns live snapshot of the in-process email queue.
   */
  getQueueStatus() {
    return {
      pending: this.queue.length,
      active: this.processing.size,
      concurrency: this.concurrency,
      stats: { ...this.stats }
    };
  }

  /**
   * Processes queued items up to the maximum concurrency limit.
   */
  async processQueue() {
    while (this.processing.size < this.concurrency && this.queue.length > 0) {
      const certificateId = this.queue.shift();
      if (!certificateId) continue;

      this.processing.add(certificateId);

      // Process individual item without blocking the event loop
      (async () => {
        try {
          await this.processItem(certificateId);
        } catch (err) {
          console.error(`Queue error processing certificate ${certificateId}:`, err);
        } finally {
          this.processing.delete(certificateId);
          this.processQueue();
        }
      })();
    }
  }

  /**
   * Process a single queued certificate item.
   */
  async processItem(certificateId) {
    const certificate = await Certificate.findById(certificateId);
    if (!certificate) return;

    if (!certificate.recipientEmail || certificate.recipientEmail.trim() === "") {
      await this.markEmailFailed(certificateId, "Recipient email is required.");
      this.stats.totalFailed += 1;
      return;
    }

    if (!isValidEmail(certificate.recipientEmail)) {
      await this.markEmailFailed(certificateId, "Please provide a valid recipient email address.");
      this.stats.totalFailed += 1;
      return;
    }

    if (!isEmailConfigured()) {
      await this.markEmailFailed(certificateId, "Email service is not configured.");
      this.stats.totalFailed += 1;
      return;
    }

    await this.markEmailSending(certificateId);

    // Foundation check: If PDF attachment generator is not yet attached, record status safely
    const content = generateCertificateEmailContent(certificate);

    const result = await sendCertificateEmail({
      to: certificate.recipientEmail,
      subject: content.subject,
      text: content.text,
      html: content.html,
      attachments: [] // Will receive PDF buffer in later step
    });

    if (result.success) {
      await this.markEmailSent(certificateId, result.messageId);
      this.stats.totalProcessed += 1;
    } else {
      await this.markEmailFailed(certificateId, result.message || "Failed to deliver email.");
      this.stats.totalFailed += 1;
    }
  }
}

export const emailQueueService = new EmailQueueService();
export default emailQueueService;
