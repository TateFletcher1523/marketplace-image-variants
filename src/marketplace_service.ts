import { z } from "zod";
import { InfraiClient } from "./infrai_client.js";

export const listingRequest = z.object({ sellerImageBase64: z.string().min(1), filename: z.string().min(1), buyerAspects: z.array(z.string().refine((aspect) => ["16:9", "1:1", "21:9", "2:3", "3:2", "3:4", "4:3", "9:16"].includes(aspect), "Unsupported crop aspect")).min(1), orderId: z.string().min(1) });
export type ListingRequest = z.infer<typeof listingRequest>;
export type ListingResult = { variants: Record<string, string>; handoffUrl: string };

export async function createListing(input: ListingRequest, client = new InfraiClient(), bucket = "marketplace-orders"): Promise<ListingResult> {
  const parsed = listingRequest.parse(input);
  const uploaded = await client.upload({ file: parsed.sellerImageBase64, filename: parsed.filename });
  const pairs = await Promise.all(parsed.buyerAspects.map(async (aspect) => [aspect, (await client.smartCrop({ image: { image_id: uploaded.image_id }, aspect })).url] as const));
  const handoff = await client.presign(bucket, `${parsed.orderId}/source.json`, { op: "put", content_type: "application/json", expires_seconds: 900, idempotency_key: parsed.orderId });
  return { variants: Object.fromEntries(pairs), handoffUrl: handoff.url };
}

if (process.argv[1]?.endsWith("marketplace_service.ts")) {
  const body = { sellerImageBase64: process.env.SAMPLE_IMAGE_BASE64 ?? "iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAACwElEQVR4nO3TMQ0AMAzAsEIcsAEbrMHoEUsGkCdz7oOsWS+ARQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQJoBSDMAaQYgzQCkGYA0A5BmANIMQNoHcq0YnTKbxicAAAAASUVORK5CYII=", filename: "shoe.png", buyerAspects: ["1:1", "3:4", "16:9"], orderId: "order-demo-1" };
  createListing(body, new InfraiClient(), process.env.INFRAI_STORAGE_BUCKET ?? "marketplace-orders").then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
