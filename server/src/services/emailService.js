import { getEmailConfig, isEmailConfigured } from "../config/email.js";
import { normalizeEmail } from "../utils/normalizeEmail.js";
import { isValidEmail } from "../utils/validateEmail.js";

let cachedTransporter = null;

/**
 * Creates or retrieves a cached Nodemailer SMTP transporter.
 * Lazy creation ensures the server starts even without valid credentials.
 */
const getTransporter = async () => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  const config = getEmailConfig();

  if (config.provider !== "smtp") {
    throw new Error(`Unsupported email provider: ${config.provider}`);
  }

  const nodemailerModule = await import("nodemailer");
  const nodemailer = nodemailerModule.default || nodemailerModule;

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return cachedTransporter;
};

/**
 * Checks whether an error is transient (e.g. rate limit, temporary socket/network issue).
 */
const isTransientError = (error) => {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  const code = String(error.code || "").toUpperCase();
  const responseCode = Number(error.responseCode);

  return (
    responseCode === 429 ||
    responseCode === 421 ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ESOCKET" ||
    code === "EAI_AGAIN" ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("try again later")
  );
};

/**
 * Sanitizes error messages to protect against credential or server path leakage.
 */
const sanitizeErrorMessage = (error) => {
  if (!error) return "Email delivery failed.";
  const msg = String(error.message || error);

  if (
    msg.toLowerCase().includes("rate limit") ||
    msg.toLowerCase().includes("too many requests") ||
    error.responseCode === 429
  ) {
    return "Email service rate limit reached. Please wait a moment before sending more emails.";
  }

  if (
    msg.toLowerCase().includes("auth") ||
    msg.toLowerCase().includes("invalid login") ||
    error.responseCode === 535
  ) {
    return "Mail service authentication failed. Please check SMTP credentials in server environment.";
  }

  if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT" || error.code === "ENOTFOUND") {
    return "Could not connect to the mail server. Please check SMTP host and port settings.";
  }

  return msg.replace(/:\/\/[^@]+@/, "://***@").slice(0, 150);
};

/**
 * Diagnostic connection check for SMTP / email provider.
 * Safe for health endpoints (never returns credentials).
 *
 * @returns {Promise<{ success: boolean, configured: boolean, connected: boolean, code?: string, message: string }>}
 */
export const verifyEmailConnection = async () => {
  if (!isEmailConfigured()) {
    return {
      success: true,
      configured: false,
      connected: false,
      message: "Email service is not configured."
    };
  }

  try {
    const transporter = await getTransporter();
    await transporter.verify();

    return {
      success: true,
      configured: true,
      connected: true,
      message: "Email service is ready."
    };
  } catch (error) {
    console.error("SMTP connection verification failed:", error?.message || error);
    const safeMsg = sanitizeErrorMessage(error);

    return {
      success: false,
      configured: true,
      connected: false,
      code: "SMTP_CONNECTION_FAILED",
      message: safeMsg || "Email service could not connect to the configured SMTP server."
    };
  }
};

/**
 * Generates default personalized subject and body for a certificate email.
 *
 * @param {Object} certificate
 * @returns {{ subject: string, text: string, html: string }}
 */
export const generateCertificateEmailContent = (certificate = {}) => {
  const participantName = certificate.participantName || "Participant";
  const eventName = certificate.eventName || "Event";
  const certificateCategory = certificate.certificateCategory || "Participation";
  const organizationName = certificate.organizationName || "Event Organization";
  const certificateTitle = certificate.certificateTitle || "Certificate of Participation";

  const subject = `Your Event Certificate – ${certificateTitle}`;

  const text = [
    `Dear ${participantName},`,
    "",
    `Please find attached your certificate for:`,
    `${eventName}`,
    "",
    `Certificate Category: ${certificateCategory}`,
    `Organization: ${organizationName}`,
    "",
    "Regards,",
    "Event Document Generator"
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #1e3a8a; margin-top: 0;">${certificateTitle}</h2>
      <p>Dear <strong>${participantName}</strong>,</p>
      <p>Please find attached your official certificate for participating in <strong>${eventName}</strong>.</p>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 16px 0; border: 1px solid #e2e8f0;">
        <p style="margin: 4px 0;"><strong>Event:</strong> ${eventName}</p>
        <p style="margin: 4px 0;"><strong>Category:</strong> ${certificateCategory}</p>
        <p style="margin: 4px 0;"><strong>Organization:</strong> ${organizationName}</p>
      </div>
      <p style="margin-top: 24px;">Regards,<br><strong>Event Document Generator</strong></p>
    </div>
  `;

  return { subject, text, html };
};

/**
 * Sends a certificate email to a single recipient with automatic transient retry.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} [options.subject] - Email subject
 * @param {string} [options.html] - HTML body
 * @param {string} [options.text] - Plain text body
 * @param {Array<Object>} [options.attachments] - Array of attachment objects
 * @returns {Promise<{ success: boolean, messageId?: string, provider?: string, code?: string, message?: string, error?: string }>}
 */
export const sendCertificateEmail = async ({
  to,
  subject,
  html,
  text,
  attachments = []
}) => {
  const normalizedTo = normalizeEmail(to);

  if (!normalizedTo) {
    return {
      success: false,
      code: "EMAIL_REQUIRED",
      message: "Recipient email is required."
    };
  }

  if (!isValidEmail(normalizedTo)) {
    return {
      success: false,
      code: "INVALID_EMAIL",
      message: "Please provide a valid recipient email address."
    };
  }

  if (!isEmailConfigured()) {
    return {
      success: false,
      code: "EMAIL_NOT_CONFIGURED",
      message: "Email service is not configured."
    };
  }

  const config = getEmailConfig();
  const fromAddress = config.fromName
    ? `"${config.fromName}" <${config.from}>`
    : config.from;

  const mailOptions = {
    from: fromAddress,
    to: normalizedTo,
    subject: subject || "Your Event Certificate",
    text: text || "",
    html: html || undefined,
    attachments: Array.isArray(attachments) ? attachments : []
  };

  const MAX_RETRIES = 2;
  const RETRY_DELAYS_MS = [2000, 5000];

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const transporter = await getTransporter();
      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: info.messageId || `msg-${Date.now()}`,
        provider: config.provider
      };
    } catch (error) {
      lastError = error;

      // Only retry if error is transient and attempts remaining
      if (attempt < MAX_RETRIES && isTransientError(error)) {
        const delay = RETRY_DELAYS_MS[attempt] || 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }

  console.error("Email dispatch failed:", lastError?.message || lastError);
  const safeMessage = sanitizeErrorMessage(lastError);

  return {
    success: false,
    code: lastError?.responseCode === 429 ? "EMAIL_RATE_LIMITED" : "EMAIL_SERVICE_UNAVAILABLE",
    message: safeMessage,
    error: safeMessage
  };
};

export default {
  verifyEmailConnection,
  sendCertificateEmail,
  generateCertificateEmailContent
};
