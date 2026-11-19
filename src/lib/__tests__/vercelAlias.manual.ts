import assert from "node:assert/strict";
import { isVercelAliasHost } from "../vercelAlias";

assert.equal(isVercelAliasHost("digital-age-v2-eight.vercel.app"), true);
assert.equal(isVercelAliasHost("Digital-Age-V2-Eight.VERCEL.APP:443"), true);
assert.equal(isVercelAliasHost("digital-age.ch"), false);
assert.equal(isVercelAliasHost("www.digital-age.ch"), false);
assert.equal(isVercelAliasHost("localhost:3107"), false);
assert.equal(isVercelAliasHost("vercel.app.example.com"), false);
assert.equal(isVercelAliasHost(null), false);
console.log("vercelAlias ok");
