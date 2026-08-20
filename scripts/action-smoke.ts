const endpoint = process.argv[2] || "https://jiuman.vercel.app/api/reply";

try {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      latest_message: "她：那不用你了，我找別人幫我",
      language: "zh-TW",
      intensity: "maximum",
      output_mode: "reply_only",
    }),
  });

  if (!response.ok) {
    console.log(`ACTION_SMOKE=FAIL status=${response.status}`);
    process.exitCode = 1;
  } else {
    const payload = (await response.json()) as { reply?: unknown };
    const nonEmptyReply = typeof payload.reply === "string" && payload.reply.trim().length > 0;
    console.log(`ACTION_SMOKE=${nonEmptyReply ? "PASS" : "FAIL"} status=${response.status} reply_nonempty=${nonEmptyReply ? "YES" : "NO"}`);
    if (!nonEmptyReply) process.exitCode = 1;
  }
} catch {
  console.log("ACTION_SMOKE=FAIL reason=network_error");
  process.exitCode = 1;
}
