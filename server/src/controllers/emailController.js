import { verifyEmailConnection } from "../services/emailService.js";

/**
 * Controller for GET /api/email/health
 * Returns email configuration and SMTP connection status without exposing credentials.
 */
export const getEmailHealth = async (req, res) => {
  try {
    const health = await verifyEmailConnection();
    // If not configured, it's still 200 with configured: false as per specification
    const statusCode = health.success ? 200 : (health.configured ? 503 : 200);

    return res.status(statusCode).json(health);
  } catch (error) {
    return res.status(500).json({
      success: false,
      configured: false,
      connected: false,
      message: "Internal error checking email health."
    });
  }
};

export default {
  getEmailHealth
};
