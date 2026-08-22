/**
 * Calculates the approximate JSON payload size in Megabytes (MB).
 */
export const getPayloadSizeMb = (data) => {
  try {
    const payloadString = typeof data === "string" ? data : JSON.stringify(data);
    const bytes = new Blob([payloadString]).size;
    return bytes / (1024 * 1024);
  } catch (error) {
    console.warn("Failed to calculate payload size:", error);
    return 0;
  }
};

export default getPayloadSizeMb;
