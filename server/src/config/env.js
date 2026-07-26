import "dotenv/config";

const DEFAULT_CLIENT_ORIGIN = "http://localhost:5173";

const normalizeOrigin = (value) => {
  try {
    const url = new URL(value.trim());

    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
};

const configuredClientUrls = process.env.CLIENT_URLS || process.env.CLIENT_URL || "";
const allowedOrigins = [
  ...configuredClientUrls.split(","),
  DEFAULT_CLIENT_ORIGIN
]
  .map(normalizeOrigin)
  .filter(Boolean)
  .filter((origin, index, origins) => origins.indexOf(origin) === index);

const nodeEnv = (process.env.NODE_ENV || "development").trim().toLowerCase();
const parsedPort = Number.parseInt(process.env.PORT || "5000", 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535
  ? parsedPort
  : 5000;
const mongoUri = (process.env.MONGO_URI || "").trim();
const isProduction = nodeEnv === "production";
const isDevelopment = !isProduction;

const validateEnvironment = () => {
  if (!mongoUri) {
    throw new Error(
      "MONGO_URI is required. Add it to server/.env or the deployment environment."
    );
  }
};

export {
  allowedOrigins,
  isDevelopment,
  isProduction,
  mongoUri,
  nodeEnv,
  port,
  validateEnvironment
};
