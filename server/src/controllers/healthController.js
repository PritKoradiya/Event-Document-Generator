import { nodeEnv } from "../config/env.js";

export const getHealthStatus = (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Event Document Generator API is running",
    projectName: "Event Document Generator",
    modules: [
      "Event Certificate Generator",
      "Poster Generator",
      "Event Report Generator",
      "Attendance Sheet Generator"
    ],
    environment: nodeEnv
  });
};
