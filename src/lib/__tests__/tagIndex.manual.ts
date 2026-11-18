import assert from "node:assert/strict";
import { TAG_INDEX_MIN_ARTICLES, tagIsIndexable } from "../tagIndex";

assert.equal(TAG_INDEX_MIN_ARTICLES, 3);
assert.equal(tagIsIndexable(0), false);
assert.equal(tagIsIndexable(1), false);
assert.equal(tagIsIndexable(2), false);
assert.equal(tagIsIndexable(3), true);
assert.equal(tagIsIndexable(13), true);
console.log("tagIndex: 5 Faelle ok");
