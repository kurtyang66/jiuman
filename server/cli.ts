import { startServer } from "./index.js";

startServer().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Failed to start Jiuman MCP server.");
  process.exitCode = 1;
});
