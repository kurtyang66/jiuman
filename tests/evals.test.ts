import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";

test("existing Jiuman eval set remains intact", () => {
  const evals = JSON.parse(readFileSync(path.resolve("evals/reply-cases.json"), "utf8")) as Array<{
    id: string;
    category: string;
  }>;
  const ids = new Set(evals.map((item) => item.id));
  const categories = new Set(evals.map((item) => item.category));

  assert.equal(evals.length, 66);
  assert.equal(ids.size, 66);
  assert.equal(categories.size, 11);
});
