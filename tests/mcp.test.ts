import assert from "node:assert/strict";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createHttpServer, createMcpServer } from "../server/index.js";
import type { GenerationProvider, GenerationRequest, GenerationResult } from "../server/providers/types.js";

class McpMockProvider implements GenerationProvider {
  readonly name = "mock";
  readonly model = "mock-model";
  readonly configured = true;

  async generate(_request: GenerationRequest): Promise<GenerationResult> {
    return { text: "MCP mock reply" };
  }
}

test("MCP discovery exposes exactly the primary reply_as_jiuman tool", async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "jiuman-test-client", version: "1.0.0" });
  const server = createMcpServer(new McpMockProvider());

  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const tools = await client.listTools();

  assert.deepEqual(tools.tools.map((tool) => tool.name), ["reply_as_jiuman"]);
  const result = await client.callTool({
    name: "reply_as_jiuman",
    arguments: { latest_message: "你還好嗎？" },
  });
  assert.deepEqual(result.structuredContent, { reply: "MCP mock reply" });

  await client.close();
  await server.close();
});

test("HTTP server exposes healthz and stateless MCP discovery without a provider call", async () => {
  const server = createHttpServer(new McpMockProvider());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server did not expose a port");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const health = await fetch(`${baseUrl}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), {
      ok: true,
      service: "jiuman",
      version: "0.3.3",
      provider: "mock",
      provider_configured: true,
      model: "mock-model",
      persistence: "none",
    });

    const discovery = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "test", version: "1.0.0" },
        },
      }),
    });
    assert.equal(discovery.status, 200);
    const initialized = (await discovery.json()) as {
      result?: { serverInfo?: { name?: string; version?: string } };
    };
    assert.equal(initialized.result?.serverInfo?.name, "jiuman");
    assert.equal(initialized.result?.serverInfo?.version, "0.3.3");

    const toolsList = await fetch(`${baseUrl}/mcp`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
    });
    assert.equal(toolsList.status, 200);
    const listed = (await toolsList.json()) as { result?: { tools?: Array<{ name: string }> } };
    assert.deepEqual(listed.result?.tools?.map((tool) => tool.name), ["reply_as_jiuman"]);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
