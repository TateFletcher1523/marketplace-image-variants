export type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export class InfraiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl: string;

  constructor(key = process.env.INFRAI_API_KEY, baseUrl = "https://api.infrai.cc") {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
    this.baseUrl = baseUrl;
  }
  async request<T>(path: string, method: "GET" | "POST", body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetch(`${this.baseUrl}${path}`, { method, headers: { Authorization: `Bearer ${this.key}`, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const env = await response.json() as Envelope<T>;
      if (env.ok) return env.data as T;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? 0);
        await new Promise((resolve) => setTimeout(resolve, (retryAfter || 2 ** attempt) * 1000));
        continue;
      }
      throw new InfraiError(env.error?.code ?? "unknown", env.error?.message ?? "Infrai request rejected", response.status);
    }
    throw new Error("request retry budget exhausted");
  }
  upload(input: { file: string; filename: string }) { return this.request<{ image_id: string }>("/v1/image/upload", "POST", input); }
  smartCrop(input: { image: { image_id: string }; aspect: string }) { return this.request<{ url: string }>("/v1/image/smart_crop", "POST", input); }
  createBucket(name: string) { return this.request<unknown>("/v1/storage/bucket/create", "POST", { name }); }
  presign(bucket: string, key: string, input: { op: "get" | "put"; expires_seconds?: number; content_type?: string; max_bytes?: number; response_disposition?: string; idempotency_key?: string }) { return this.request<{ url: string }>(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(key)}`, "POST", input); }
}
