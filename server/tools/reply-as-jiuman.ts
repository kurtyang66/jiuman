import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { generateReply, INTENSITY_VALUES, replyInputSchema, replyInputShape } from "../generate.js";
import type { ReplyInput, ReplyOutput } from "../generate.js";
import type { GenerationProvider } from "../providers/types.js";

export const REPLY_AS_JIUMAN_TOOL_NAME = "reply_as_jiuman";
export const REPLY_AS_JIUMAN_TOOL_DESCRIPTION =
  "Use this tool when the user wants a reply generated in the fictional Jiuman relationship persona. " +
  "Pass the latest partner message and only the relationship context needed for this reply. " +
  "The tool is stateless, returns the reply without therapist framing, and never stores the conversation.";

export const replyOutputShape = {
  reply: z.string(),
  mode: z.enum(INTENSITY_VALUES).optional(),
  triggers: z.array(z.string()).optional(),
  brief_analysis: z.string().optional(),
};

export type ReplyToolResult = {
  content: [{ type: "text"; text: string }];
  structuredContent: ReplyOutput;
};

export function createReplyAsJiumanHandler(provider: GenerationProvider) {
  return async (rawInput: unknown): Promise<ReplyToolResult> => {
    const input: ReplyInput = replyInputSchema.parse(rawInput);
    const output = await generateReply(input, provider);

    return {
      content: [{ type: "text", text: output.reply }],
      structuredContent: output,
    };
  };
}

export function registerReplyAsJiumanTool(
  server: McpServer,
  provider: GenerationProvider,
): void {
  const handler = createReplyAsJiumanHandler(provider);

  server.registerTool(
    REPLY_AS_JIUMAN_TOOL_NAME,
    {
      title: "Reply as Jiuman",
      description: REPLY_AS_JIUMAN_TOOL_DESCRIPTION,
      inputSchema: replyInputShape,
      outputSchema: replyOutputShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async (input) => handler(input),
  );
}
