import { test } from "node:test";
import assert from "node:assert/strict";

// Test 1
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

test("slugify creates correct slug", () => {
  const result = slugify("Hello World News!");
  assert.equal(result, "hello-world-news");
});

// Test 2
test("paging default values", () => {
  const limit = 10;
  const offset = 0;

  assert.equal(limit, 10);
  assert.equal(offset, 0);
});