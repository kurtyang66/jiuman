import dotenv from "dotenv";
import { createServer as createNodeHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createGenerationProvider } from "./providers/index.js";
import type { GenerationProvider } from "./providers/types.js";
import { registerReplyAsJiumanTool } from "./tools/reply-as-jiuman.js";

export const APP_VERSION = "0.2.0";
export const DEFAULT_PORT = 3000;

dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: false, quiet: true });

function setCorsHeaders(response: ServerResponse): void {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Session-Id, Last-Event-ID");
  response.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id, Last-Event-ID");
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  if (response.headersSent) return;
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request: IncomingMessage, maxBytes = 1_000_000): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) {
      throw new Error("Request body is too large.");
    }
    chunks.push(buffer);
  }

  const body = Buffer.concat(chunks).toString("utf8").trim();
  if (!body) return undefined;
  return JSON.parse(body);
}

export function createMcpServer(provider: GenerationProvider = createGenerationProvider()): McpServer {
  const server = new McpServer(
    {
      name: "jiuman",
      version: APP_VERSION,
      websiteUrl: "https://github.com/kurtyang66/jiuman",
    },
    {
      instructions:
        "This is a tool-only Jiuman persona server. Call reply_as_jiuman for a stateless relationship reply.",
    },
  );
  registerReplyAsJiumanTool(server, provider);
  return server;
}

async function handleMcpRequest(
  request: IncomingMessage,
  response: ServerResponse,
  provider: GenerationProvider,
): Promise<void> {
  let body: unknown;
  try {
    body = await readJsonBody(request);
  } catch {
    sendJson(response, 400, { error: "Invalid JSON request body." });
    return;
  }

  try {
    // Stateless mode intentionally creates a fresh server and transport per request.
    // No session state, transcript, or raw request body is retained.
    const server = createMcpServer(provider);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    await transport.handleRequest(request, response, body);
  } catch {
    sendJson(response, 500, { error: "MCP request could not be completed." });
  }
}

export function createHttpServer(provider: GenerationProvider = createGenerationProvider()) {
  return createNodeHttpServer(async (request, response) => {
    setCorsHeaders(response);

    if (request.method === "OPTIONS") {
      response.statusCode = 204;
      response.end();
      return;
    }

    const requestUrl = new URL(request.url || "/", "http://localhost");

    if (requestUrl.pathname === "/healthz" && request.method === "GET") {
      sendJson(response, 200, {
        ok: true,
        service: "jiuman",
        version: APP_VERSION,
        provider: provider.name,
        provider_configured: provider.configured,
        model: provider.model,
        persistence: "none",
      });
      return;
    }

    if (requestUrl.pathname === "/mcp") {
      if (request.method === "POST") {
        await handleMcpRequest(request, response, provider);
        return;
      }
      response.setHeader("Allow", "POST, OPTIONS");
      sendJson(response, 405, { error: "Only POST is supported for this stateless MCP endpoint." });
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  });
}

export async function startServer(port = Number(process.env.PORT || DEFAULT_PORT)): Promise<void> {
  const provider = createGenerationProvider();
  const server = createHttpServer(provider);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => {
      server.off("error", reject);
      resolve();
    });
  });
  console.log(`Jiuman MCP server listening on http://localhost:${port}/mcp`);
}

const entryPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (entryPath === path.resolve(fileURLToPath(import.meta.url))) {
  startServer().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Failed to start Jiuman MCP server.");
    process.exitCode = 1;
  });
}
