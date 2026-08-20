import { generateReply } from "../server/generate.js";
import type { GenerationProvider, GenerationRequest, GenerationResult } from "../server/providers/types.js";

class StubProvider implements GenerationProvider {
  readonly name = "mock";
  readonly model = "mock-model";
  readonly configured = true;

  async generate(request: GenerationRequest): Promise<GenerationResult> {
    if (request.outputMode === "reply_with_analysis") {
      return {
        text: JSON.stringify({
          reply: "好啦，我知道了，只是剛剛那句我真的會在意。",
          mode: "hurt",
          triggers: ["reassurance"],
          brief_analysis: "The reply softens after reassurance without denying the earlier hurt.",
        }),
      };
    }
    return { text: "你先讓我想一下，這句我真的會有點在意。" };
  }
}

const provider = new StubProvider();
const reply = await generateReply(
  {
    latest_message: "我只是想找別人幫忙而已。",
    intensity: "maximum",
    language: "zh-TW",
    output_mode: "reply_only",
  },
  provider,
);
if (!reply.reply) throw new Error("local reply_only smoke returned no reply");

const analyzed = await generateReply(
  {
    latest_message: "你不要生氣，我還是最在乎你。",
    intensity: "hurt",
    language: "zh-TW",
    output_mode: "reply_with_analysis",
  },
  provider,
);
if (!("brief_analysis" in analyzed) || !analyzed.brief_analysis) {
  throw new Error("local reply_with_analysis smoke returned no analysis");
}

console.log("LOCAL_SMOKE=PASS cases=2 external_requests=0");
