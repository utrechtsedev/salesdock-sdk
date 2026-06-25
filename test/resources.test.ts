import { describe, it, expect } from "vitest";
import { makeClient, jsonResponse, envelope } from "./helpers.js";

describe("webhooks", () => {
  it("subscribe posts the body and returns the subscription", async () => {
    const { sd, calls } = makeClient(() =>
      jsonResponse(
        envelope({
          uuid: "c801bed5",
          event: "offer.accepted",
          target_url: "https://example.com",
          subscribed_at: "2023-05-02T12:01:40.000000Z",
        }),
        201,
      ),
    );
    const sub = await sd.webhooks.subscribe({
      event: "offer.accepted",
      target_url: "https://example.com",
    });
    expect(sub.uuid).toBe("c801bed5");
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.url).toContain("/v1/account/webhooks");
    expect(JSON.parse(calls[0]!.body!)).toEqual({
      event: "offer.accepted",
      target_url: "https://example.com",
    });
    expect(calls[0]!.headers["Content-Type"]).toBe("application/json");
  });

  it("listEvents returns the event names", async () => {
    const { sd } = makeClient(() => jsonResponse(envelope(["offer.accepted", "lead.created"])));
    const events = await sd.webhooks.listEvents();
    expect(events).toContain("lead.created");
  });
});

describe("sales", () => {
  it("createDefault posts to the flow endpoint without a scope segment", async () => {
    const { sd, calls } = makeClient(() => jsonResponse(envelope({ sale_id: 440 }), 201));
    const res = await sd.sales.createDefault("energy", "abc-flow", {
      transaction_type: "offer",
      product_id: "1",
      email: "test@salesdock.nl",
      questionData: { betaalwijze: "Automatische incasso" },
      agreements: { "privacy-statement": "1" },
    });
    expect(res.sale_id).toBe(440);
    expect(calls[0]!.url).toBe("https://app.salesdock.nl/api/demo/v1/sales/flow/energy/abc-flow");
  });

  it("solar.create uses the fixed solar-panels flow type", async () => {
    const { sd, calls } = makeClient(() => jsonResponse(envelope({ sale_id: 5 })));
    await sd.sales.solar.create("flow-1", { transaction_type: "offer", product_id: 1 });
    expect(calls[0]!.url).toContain("/sales/flow/solar-panels/flow-1");
  });

  it("updateStatus sends status via query params on the account scope", async () => {
    const { sd, calls } = makeClient(() => jsonResponse(envelope([])));
    await sd.sales.updateStatus(440, { status: "won", mark_processed: 1 });
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toContain("/v1/account/sales/updatestatus/440");
    expect(url.searchParams.get("status")).toBe("won");
    expect(url.searchParams.get("mark_processed")).toBe("1");
  });

  it("getContract reads the account contract endpoint", async () => {
    const { sd, calls } = makeClient(() =>
      jsonResponse(envelope({ id: 1, contract: { content: "JVBERi0=" } })),
    );
    const c = await sd.sales.getContract(1);
    expect(c.contract?.content).toBe("JVBERi0=");
    expect(calls[0]!.url).toContain("/v1/account/sales/contract/1");
  });
});

describe("relations", () => {
  it("create posts the body and returns the new id", async () => {
    const { sd, calls } = makeClient(() => jsonResponse(envelope({ relation_id: 2325798 }), 201));
    const res = await sd.relations.create({ firstname: "Jane", business: "1" });
    expect(res.relation_id).toBe(2325798);
    expect(calls[0]!.method).toBe("POST");
    expect(calls[0]!.url).toContain("/v1/user/relations");
  });

  it("get uses the account scope for a single relation", async () => {
    const { sd, calls } = makeClient(() => jsonResponse(envelope({ id: 1 })));
    await sd.relations.get(1);
    expect(calls[0]!.url).toContain("/v1/account/relations/1");
  });
});

describe("products", () => {
  it("list forwards filter params and returns a plain array", async () => {
    const { sd, calls } = makeClient(() => jsonResponse(envelope([{ id: 424, name: "P" }])));
    const products = await sd.products.list({ business: 1, q: "test" });
    expect(products[0]!.id).toBe(424);
    const url = new URL(calls[0]!.url);
    expect(url.searchParams.get("business")).toBe("1");
    expect(url.searchParams.get("q")).toBe("test");
  });

  it("exposes the suppliers sub-client", async () => {
    const { sd, calls } = makeClient(() => jsonResponse(envelope([])));
    await sd.products.suppliers.list();
    expect(calls[0]!.url).toContain("/v1/user/suppliers");
  });
});
