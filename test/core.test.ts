import { describe, it, expect } from "vitest";
import {
  Salesdock,
  SalesdockAuthenticationError,
  SalesdockNotFoundError,
  SalesdockValidationError,
  SalesdockRateLimitError,
  SalesdockForbiddenError,
  SalesdockServerError,
  SalesdockTimeoutError,
  SalesdockResponseValidationError,
  SalesdockInvalidRequestError,
  decodeBase64,
} from "../src/index.js";
import { makeClient, jsonResponse, envelope } from "./helpers.js";

describe("configuration", () => {
  it("throws on missing domain/token", () => {
    // @ts-expect-error intentionally invalid
    expect(() => new Salesdock({ token: "x" })).toThrow(/domain/);
    // @ts-expect-error intentionally invalid
    expect(() => new Salesdock({ domain: "d" })).toThrow(/token/);
  });

  it("exposes production and staging base URLs", () => {
    expect(Salesdock.PRODUCTION_BASE_URL).toBe("https://app.salesdock.nl");
    expect(Salesdock.STAGING_BASE_URL).toBe("https://app-staging.salesdock.nl");
  });
});

describe("URL building and auth", () => {
  it("builds the api/{domain}/{version}/{scope} path and sends the bearer token", async () => {
    const { sd, calls } = makeClient(() => jsonResponse(envelope([])));
    await sd.products.list();
    expect(calls[0]!.url).toBe("https://app.salesdock.nl/api/demo/v1/user/products");
    expect(calls[0]!.headers["Authorization"]).toBe("Bearer tok");
    expect(calls[0]!.headers["Accept"]).toBe("application/json");
  });

  it("honors a per-call scope override", async () => {
    const { sd, calls } = makeClient(() => jsonResponse(envelope([])));
    await sd.products.list({}, { scope: "account" });
    expect(calls[0]!.url).toContain("/v1/account/products");
  });

  it("uses the configured scope, version and staging base URL", async () => {
    const { sd, calls } = makeClient(() => jsonResponse(envelope([])), {
      scope: "account",
      version: "v2",
      baseUrl: Salesdock.STAGING_BASE_URL,
    });
    await sd.products.list();
    expect(calls[0]!.url).toBe("https://app-staging.salesdock.nl/api/demo/v2/account/products");
  });

  it("encodes array query params as key[]", async () => {
    const { sd, calls } = makeClient(() =>
      jsonResponse(envelope({ current_page: 1, data: [], last_page: 1, per_page: 20, total: 0 })),
    );
    await sd.sales.list({ statuses: ["new", "won"], flow_id: 7 });
    const url = new URL(calls[0]!.url);
    expect(url.searchParams.getAll("statuses[]")).toEqual(["new", "won"]);
    expect(url.searchParams.get("flow_id")).toBe("7");
  });
});

describe("envelope and error mapping", () => {
  it("unwraps the data field on success", async () => {
    const { sd } = makeClient(() => jsonResponse(envelope([{ id: 1, name: "P" }])));
    const products = await sd.products.list();
    expect(products[0]!.id).toBe(1);
  });

  it.each([
    [401, SalesdockAuthenticationError],
    [403, SalesdockForbiddenError],
    [404, SalesdockNotFoundError],
    [429, SalesdockRateLimitError],
    [500, SalesdockServerError],
  ])("maps HTTP %s to the right error class", async (status, Err) => {
    const { sd } = makeClient(() => jsonResponse({ success: false, message: "nope" }, status), {
      maxRetries: 0,
    });
    await expect(sd.products.get(1)).rejects.toBeInstanceOf(Err);
  });

  it("exposes field errors on validation failures", async () => {
    const { sd } = makeClient(() =>
      jsonResponse(
        { success: false, message: "Validatie fout", code: 400, errors: { email: ["required"] } },
        400,
      ),
    );
    try {
      await sd.products.get(1);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SalesdockValidationError);
      const e = err as SalesdockValidationError;
      expect(e.status).toBe(400);
      expect(e.errors?.email).toEqual(["required"]);
    }
  });

  it("treats success:false on a 200 as an error", async () => {
    const { sd } = makeClient(() => jsonResponse({ success: false, message: "Not allowed" }, 200), {
      maxRetries: 0,
    });
    await expect(sd.products.get(1)).rejects.toThrow(/Not allowed/);
  });
});

describe("retries", () => {
  it("retries 429 then succeeds", async () => {
    let n = 0;
    const { sd, calls } = makeClient(() => {
      n++;
      return n < 3
        ? jsonResponse({ success: false, message: "Too Many Attempts." }, 429)
        : jsonResponse(envelope([{ id: 1 }]));
    });
    const res = await sd.products.list();
    expect(res).toHaveLength(1);
    expect(calls).toHaveLength(3);
  });

  it("gives up after maxRetries", async () => {
    const { sd, calls } = makeClient(() => jsonResponse({ success: false, message: "boom" }, 503), {
      maxRetries: 1,
    });
    await expect(sd.products.list()).rejects.toBeInstanceOf(SalesdockServerError);
    expect(calls).toHaveLength(2); // initial + 1 retry
  });

  it("respects the Retry-After header", async () => {
    let n = 0;
    const { sd } = makeClient(() => {
      n++;
      return n < 2
        ? jsonResponse({ success: false, message: "slow" }, 429, { "retry-after": "0" })
        : jsonResponse(envelope([]));
    });
    await sd.products.list();
    expect(n).toBe(2);
  });
});

describe("timeout", () => {
  it("aborts and throws SalesdockTimeoutError", async () => {
    const { sd } = makeClient(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
      { timeout: 20, maxRetries: 0 },
    );
    await expect(sd.products.list()).rejects.toBeInstanceOf(SalesdockTimeoutError);
  });
});

describe("validation toggles", () => {
  it("validates request input and throws before sending", () => {
    const { sd, calls } = makeClient(() => jsonResponse(envelope({ sale_id: 1 })));
    expect(() =>
      // event must be a string and target_url a URL
      // @ts-expect-error invalid input
      sd.webhooks.subscribe({ event: 123, target_url: "not-a-url" }),
    ).toThrow(SalesdockInvalidRequestError);
    expect(calls).toHaveLength(0); // never sent
  });

  it("skips request validation when disabled", async () => {
    const { sd, calls } = makeClient(
      () => jsonResponse(envelope({ uuid: "x", event: "e", target_url: "u", subscribed_at: "t" })),
      {
        validateRequests: false,
      },
    );
    // @ts-expect-error invalid input bypassed
    await sd.webhooks.subscribe({ event: 123 });
    expect(calls).toHaveLength(1);
  });

  it("throws SalesdockResponseValidationError on malformed responses", async () => {
    // sales.get expects an object payload; a bare string fails SaleSchema.
    const { sd } = makeClient(() => jsonResponse(envelope("a string where an object is expected")));
    await expect(sd.sales.get(1)).rejects.toBeInstanceOf(SalesdockResponseValidationError);
  });

  it("skips response validation when disabled", async () => {
    const { sd } = makeClient(() => jsonResponse(envelope("totally wrong shape")), {
      validateResponses: false,
    });
    const res = await sd.sales.get(1);
    expect(res).toBe("totally wrong shape");
  });
});

describe("decodeBase64", () => {
  it("decodes base64 to bytes (PDF header)", () => {
    const bytes = decodeBase64("JVBERi0="); // "%PDF-"
    expect(Array.from(bytes)).toEqual([0x25, 0x50, 0x44, 0x46, 0x2d]);
  });

  it("ignores whitespace/newlines in the input", () => {
    const bytes = decodeBase64("JV BE\nRi0=");
    expect(bytes[0]).toBe(0x25);
  });
});

describe("raw request escape hatch", () => {
  it("issues an arbitrary call and returns data", async () => {
    const { sd, calls } = makeClient(() => jsonResponse(envelope({ ok: true })));
    const data = await sd.request<{ ok: boolean }>("GET", ["account", "commissions", "outgoing"]);
    expect(data.ok).toBe(true);
    expect(calls[0]!.url).toContain("/v1/account/commissions/outgoing");
  });
});
