import { describe, it, expect } from "vitest";
import {
  SalesdockServerError,
  SalesdockTimeoutError,
  SalesdockConnectionError,
} from "../src/index.js";
import { makeClient, jsonResponse, envelope } from "./helpers.js";

const flowArgs = ["flow-type", "flow-id"] as const;

describe("retry idempotency (no duplicate writes)", () => {
  it("does NOT retry a POST on 5xx", async () => {
    const { sd, calls } = makeClient(() => jsonResponse({ success: false, message: "boom" }, 503));
    await expect(sd.sales.createDefault(...flowArgs, { product_id: "1" })).rejects.toBeInstanceOf(
      SalesdockServerError,
    );
    expect(calls).toHaveLength(1); // sent exactly once
  });

  it("DOES retry a POST on 429 (throttled before processing)", async () => {
    let n = 0;
    const { sd, calls } = makeClient(() => {
      n++;
      return n < 2
        ? jsonResponse({ success: false, message: "Too Many Attempts." }, 429)
        : jsonResponse(envelope({ sale_id: 7 }), 201);
    });
    const res = await sd.sales.createDefault(...flowArgs, { product_id: "1" });
    expect(res.sale_id).toBe(7);
    expect(calls).toHaveLength(2);
  });

  it("retries a POST on 5xx when explicitly marked idempotent", async () => {
    let n = 0;
    const { sd, calls } = makeClient(() => {
      n++;
      return n < 2
        ? jsonResponse({ success: false, message: "boom" }, 503)
        : jsonResponse(envelope({ sale_id: 9 }), 201);
    });
    const res = await sd.sales.createDefault(
      ...flowArgs,
      { product_id: "1" },
      { idempotent: true },
    );
    expect(res.sale_id).toBe(9);
    expect(calls).toHaveLength(2);
  });

  it("still retries GET on 5xx", async () => {
    let n = 0;
    const { sd, calls } = makeClient(() => {
      n++;
      return n < 2
        ? jsonResponse({ success: false, message: "boom" }, 500)
        : jsonResponse(envelope([]));
    });
    await sd.products.list();
    expect(calls).toHaveLength(2);
  });
});

describe("abort & timeout are not retried", () => {
  it("does not retry a caller-aborted request", async () => {
    const ac = new AbortController();
    ac.abort();
    const { sd, calls } = makeClient(
      (_url, init) => {
        if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
        return jsonResponse(envelope([]));
      },
      { maxRetries: 2 },
    );
    await expect(sd.products.list({}, { signal: ac.signal })).rejects.toBeInstanceOf(
      SalesdockConnectionError,
    );
    expect(calls).toHaveLength(1);
  });

  it("does not retry a timed-out request", async () => {
    const { sd, calls } = makeClient(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
      { timeout: 15, maxRetries: 2 },
    );
    await expect(sd.products.list()).rejects.toBeInstanceOf(SalesdockTimeoutError);
    expect(calls).toHaveLength(1);
  });
});

describe("response body edge cases", () => {
  it("treats an empty success body as no data (no validation error)", async () => {
    const { sd } = makeClient(() => new Response("", { status: 200 }));
    await expect(sd.sales.cancel(1, { status: "cancelled" })).resolves.toBeUndefined();
  });

  it("with validateResponses:false, unwraps envelope or returns the raw body", async () => {
    const enveloped = makeClient(() => jsonResponse(envelope([{ id: 1 }])), {
      validateResponses: false,
    });
    expect(await enveloped.sd.products.list()).toEqual([{ id: 1 }]);

    const bare = makeClient(() => jsonResponse([{ id: 2 }]), { validateResponses: false });
    expect(await bare.sd.products.list()).toEqual([{ id: 2 }]);
  });

  it("preserves a non-JSON error body as the error message", async () => {
    const { sd } = makeClient(() => new Response("Service Unavailable", { status: 500 }), {
      maxRetries: 0,
    });
    await expect(sd.products.list()).rejects.toThrow(/Service Unavailable/);
  });
});

describe("pagination stays on the configured base URL", () => {
  it("re-pages against baseUrl even when next_page_url points elsewhere", async () => {
    const stagingBase = "https://app-staging.salesdock.nl";
    const page = (n: number) =>
      envelope({
        current_page: n,
        data: [{ id: n }],
        last_page: 2,
        per_page: 1,
        total: 2,
        // The API embeds PRODUCTION urls in the paginator:
        next_page_url:
          n < 2 ? `https://app.salesdock.nl/api/demo/v1/user/relations?page=${n + 1}` : null,
        prev_page_url: null,
      });
    const { sd, calls } = makeClient((url) => jsonResponse(page(url.includes("page=2") ? 2 : 1)), {
      baseUrl: stagingBase,
    });
    const items: number[] = [];
    for await (const r of await sd.relations.list()) items.push(r.id as number);
    expect(items).toEqual([1, 2]);
    // Every request — including page 2 — must hit staging, not the embedded production host.
    expect(calls.every((c) => c.url.startsWith(stagingBase))).toBe(true);
    expect(calls[1]!.url).toContain("page=2");
  });
});

describe("shared /statuses endpoint accepts a numeric id", () => {
  it("leads.listStatuses does not reject a numeric status id", async () => {
    const { sd } = makeClient(() =>
      jsonResponse(envelope([{ source: "lead", id: 42, name: "New", type: "open" }])),
    );
    const statuses = await sd.leads.listStatuses();
    expect(statuses[0]!.id).toBe(42);
  });
});
