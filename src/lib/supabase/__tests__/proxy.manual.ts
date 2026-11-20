// npx tsx src/lib/supabase/__tests__/proxy.manual.ts
import assert from "node:assert/strict";
import { isProtectedAuthorPath } from "../proxy";

for (const p of ["/autor/admin", "/autor/admin/startups", "/autor/dashboard", "/autor/artikel/neu", "/autor/freigaben", "/autor/seiten/1", "/autor/news-ticker"]) {
  assert.equal(isProtectedAuthorPath(p), true, p);
}
for (const p of ["/autor", "/autor/ali-soy", "/autoren", "/artikel/admin", "/autor/administrator"]) {
  assert.equal(isProtectedAuthorPath(p), false, p);
}
console.log("proxy: ok");
