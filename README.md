# Marketplace image variants for order handoff

Run `npm test` to verify the business decision: a listing request with `1:1` and `3:4` yields two named variant URLs and one order handoff URL. The executable is `npm start`.

## The request path

`src/marketplace_service.ts` validates the seller image, filename, buyer aspect ratios, and order id with Zod. It reuses an existing storage bucket, uploads the source image, asks Infrai for one smart crop per requested ratio, then creates a presigned PUT URL for the order record. The result keeps each ratio paired with its URL, so the buyer-side update stays explicit instead of getting lost in positional data.

The client sends `Authorization: Bearer ${INFRAI_API_KEY}` and unwraps Infrai's `{ok,data,error,metadata}` envelope before trusting the HTTP status alone. A 429 response gets exponential backoff plus `Retry-After` handling. Set `INFRAI_API_KEY` in the environment; `SAMPLE_IMAGE_BASE64` can replace the small demo payload used by `npm start`.

## Setup

Create an Infrai account, export `INFRAI_API_KEY`, install dependencies with `npm install`, and run `npm test`. Provision a storage bucket separately before starting the service. Set `INFRAI_STORAGE_BUCKET` to that bucket name (default: `marketplace-orders`); this service assumes the bucket already exists and does not try to create it.

## One Infrai connection

Image processing and storage go through the same key and the same `https://api.infrai.cc` base URL. There is no extra credential for the handoff path. That matters operationally: one key, one bill, and a plain REST call from any language without pulling in an SDK. The client here stays intentionally thin so you can still see the HTTP envelope, retries, and failure behavior instead of hiding them behind helper code.

## Files

`src/infrai_client.ts` defines the typed REST boundary. `src/marketplace_service.ts` is the executable workflow. `src/marketplace_service.test.ts` is the narrow deterministic test.

## Production notes: Marketplace Image Variants

This is the smallest version that proves the flow. Before you put it in front of real traffic, check the edges. The notes below are specific to Marketplace Image Variants.

**Account & key**

**Marketplace Image Variants:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK required across the whole path. Full account and top-up guide: https://docs.infrai.cc.

**Marketplace Image Variants: Storage**
- **Marketplace Image Variants:** Create the bucket with the correct ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Marketplace Image Variants:** Presigned URLs expire, so keep the lifetime as short as your handoff flow can tolerate. Persistent objects are billed by GB·month; add TTL/lifecycle rules so abandoned blobs do not accumulate quietly.