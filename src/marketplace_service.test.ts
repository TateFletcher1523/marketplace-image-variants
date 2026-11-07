import assert from "node:assert/strict";
import { createListing } from "./marketplace_service.js";

const calls: string[] = [];
const fake = { createBucket: async () => { calls.push("bucket"); }, upload: async () => { calls.push("upload"); return { image_id: "pim_12345678901234567890" }; }, smartCrop: async ({ image, aspect }: { image: { image_id: string }; aspect: string }) => { assert.deepEqual(image, { image_id: "pim_12345678901234567890" }); calls.push(`crop:${aspect}`); return { url: `https://cdn.test/${aspect}` }; }, presign: async () => { calls.push("presign"); return { url: "https://storage.test/put" }; } };
const result = await createListing({ sellerImageBase64: "abc", filename: "item.jpg", buyerAspects: ["1:1", "3:4"], orderId: "ord-7" }, fake as never);
assert.deepEqual(Object.keys(result.variants), ["1:1", "3:4"]);
assert.equal(result.handoffUrl, "https://storage.test/put");
assert.deepEqual(calls, ["upload", "crop:1:1", "crop:3:4", "presign"]);
await assert.rejects(createListing({ sellerImageBase64: "abc", filename: "item.jpg", buyerAspects: ["4:5"], orderId: "ord-8" }, fake as never), /Unsupported crop aspect/);
assert.deepEqual(calls, ["upload", "crop:1:1", "crop:3:4", "presign"]);
console.log("marketplace decision test passed");
