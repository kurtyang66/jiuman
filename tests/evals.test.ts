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

test("screenshot fidelity eval fixture satisfies its separate contract", () => {
  const evals = JSON.parse(
    readFileSync(path.resolve("evals/screenshot-fidelity-cases.json"), "utf8"),
  ) as Array<{
    id: string;
    category: string;
    input: string;
    expected_traits: string[];
    forbidden_traits: string[];
  }>;
  const requiredFields = ["id", "category", "input", "expected_traits", "forbidden_traits"] as const;
  const ids = new Set(evals.map((item) => item.id));

  assert.ok(Array.isArray(evals));
  assert.ok(evals.length >= 20);
  assert.equal(ids.size, evals.length);

  evals.forEach((item, index) => {
    for (const field of requiredFields) {
      assert.ok(field in item, `screenshot fidelity case ${index} is missing ${field}`);
    }
    assert.equal(typeof item.id, "string");
    assert.ok(item.id.length > 0);
    assert.equal(typeof item.category, "string");
    assert.ok(item.category.length > 0);
    assert.equal(typeof item.input, "string");
    assert.ok(item.input.length > 0);
    assert.ok(Array.isArray(item.expected_traits));
    assert.ok(item.expected_traits.length > 0);
    assert.ok(item.expected_traits.every((trait) => typeof trait === "string" && trait.length > 0));
    assert.ok(Array.isArray(item.forbidden_traits));
    assert.ok(item.forbidden_traits.length > 0);
    assert.ok(item.forbidden_traits.every((trait) => typeof trait === "string" && trait.length > 0));
  });

  const existingCount = JSON.parse(
    readFileSync(path.resolve("evals/reply-cases.json"), "utf8"),
  ).length as number;
  console.log(
    `eval counts: existing=${existingCount}; screenshot_fidelity=${evals.length}; total=${existingCount + evals.length}`,
  );
});
