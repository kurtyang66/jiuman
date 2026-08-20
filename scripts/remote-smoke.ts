import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const remoteBaseUrl = (process.env.JIUMAN_REMOTE_URL ?? process.argv[2] ?? "").replace(/\/$/, "");
if (!remoteBaseUrl) {
  console.error("REMOTE_SMOKE=BLOCKED_NO_URL");
  process.exit(2);
}

const endpoint = new URL(`${remoteBaseUrl}/mcp`);
const cases = [
  { id: "normal", latest_message: "她：我下班了，等等回家" },
  { id: "replacement", latest_message: "她：那不用你了，我找別人幫我" },
  { id: "reassurance", latest_message: "她：那不用你了，我找別人" },
] as const;

const client = new Client({ name: "jiuman-remote-smoke", version: "0.3.2" });
const transport = new StreamableHTTPClientTransport(endpoint, {
  requestInit: {
    headers: {
      Accept: "application/json, text/event-stream",
    },
  },
});

function isNonEmptyReply(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const reply = (value as { reply?: unknown }).reply;
  return typeof reply === "string" && reply.trim().length > 0;
}

try {
  await client.connect(transport);
  const tools = await client.listTools();
  const names = tools.tools.map((tool) => tool.name);
  if (names.length !== 1 || names[0] !== "reply_as_jiuman") {
    console.error("REMOTE_SMOKE=FAIL stage=tool_discovery");
    process.exitCode = 1;
  } else {
    for (const testCase of cases) {
      const result = await client.callTool({
        name: "reply_as_jiuman",
        arguments: {
          latest_message: testCase.latest_message,
          intensity: "maximum",
          language: "zh-TW",
          output_mode: "reply_only",
        },
      });
      const structuredContent = (result as { structuredContent?: unknown }).structuredContent;
      if (result.isError || !isNonEmptyReply(structuredContent)) {
        console.error(`REMOTE_SMOKE=FAIL case=${testCase.id}`);
        process.exitCode = 1;
        break;
      }
      console.log(`case=${testCase.id} PASS`);
    }
  }
} catch {
  console.error("REMOTE_SMOKE=FAIL stage=connection_or_generation");
  process.exitCode = 1;
} finally {
  await client.close().catch(() => undefined);
}

if (process.exitCode !== 1) {
  console.log("REMOTE_SMOKE=PASS calls=3");
}
