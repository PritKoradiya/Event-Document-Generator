import dotenv from "dotenv";

dotenv.config();

/**
 * Loads and returns email configuration from environment variables.
 */
export const getEmailConfig = () => {
  const provider = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase().trim();
  const host = (process.env.SMTP_HOST || "").trim();
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = (process.env.SMTP_USER || "").trim();
  const pass = process.env.SMTP_PASS || "";
  const from = (process.env.EMAIL_FROM || user || "").trim();
  const fromName = (process.env.EMAIL_FROM_NAME || "Event Document Generator").trim();

  return {
    provider,
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    from,
    fromName
  };
};

/**
 * Checks whether required email credentials and SMTP parameters are configured.
 *
 * @returns {boolean}
 */
export const isEmailConfigured = () => {
  const config = getEmailConfig();

  if (config.provider === "smtp") {
    return Boolean(
      config.host &&
      config.port &&
      config.auth.user &&
      config.auth.pass &&
      config.from
    );
  }

  return false;
};

// Safe startup configuration check (never throws or crashes the server)
if (!isEmailConfigured()) {
  console.log("Email service not configured");
} else {
  console.log(`Email service configured using provider: ${getEmailConfig().provider}`);
}

export default {
  getEmailConfig,
  isEmailConfigured
};
