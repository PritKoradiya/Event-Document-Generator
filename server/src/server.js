import mongoose from "mongoose";
import app from "./app.js";
import connectDB from "./config/db.js";
import { port, validateEnvironment } from "./config/env.js";

let server;
let isShuttingDown = false;

const shutdown = async (signal) => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log(`${signal} received. Shutting down gracefully.`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }

  process.exit(0);
};

const startServer = async () => {
  try {
    validateEnvironment();
    await connectDB();

    server = app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error(`Startup error: ${error.message}`);
    process.exit(1);
  }
};

process.on("SIGINT", () => {
  shutdown("SIGINT").catch((error) => {
    console.error(`Shutdown error: ${error.message}`);
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM").catch((error) => {
    console.error(`Shutdown error: ${error.message}`);
    process.exit(1);
  });
});

startServer();
