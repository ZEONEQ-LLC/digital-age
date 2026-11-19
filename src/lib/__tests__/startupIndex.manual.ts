import assert from "node:assert/strict";
import { startupIsIndexable } from "../startupIndex";

const long = "x".repeat(600);
assert.equal(startupIsIndexable({ verified_at: null, description: long }), false);
assert.equal(startupIsIndexable({ verified_at: "2026-11-19T00:00:00Z", description: null }), false);
assert.equal(startupIsIndexable({ verified_at: "2026-11-19T00:00:00Z", description: "x".repeat(599) }), false);
assert.equal(startupIsIndexable({ verified_at: "2026-11-19T00:00:00Z", description: `  ${"x".repeat(599)}  ` }), false);
assert.equal(startupIsIndexable({ verified_at: "2026-11-19T00:00:00Z", description: long }), true);
console.log("startupIndex ok");
