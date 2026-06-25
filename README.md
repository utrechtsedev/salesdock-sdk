# salesdock

A universal, fully-typed **TypeScript SDK for the [Salesdock](https://app.salesdock.nl) API**.

- **Every endpoint** of the Salesdock API, as typed resource methods (sales, leads, forms, products, relations, commissions, tasks, dialer, users/organisations, webhooks).
- **Runs everywhere** — built on the Web-standard `fetch`, with **zero Node.js built-ins**. Works on **Cloudflare Workers**, Deno, Bun, the browser and Node.js 18+.
- **Runtime validation with [Zod](https://zod.dev)** — request inputs are validated _before_ they are sent; responses are validated on the way in (and tolerant of new fields).
- **Dual ESM + CommonJS** with bundled type declarations.
- Built-in **pagination** (offset + cursor), **automatic retries** with backoff for `429`/`5xx`, **timeouts**, and **typed errors**.
- One runtime dependency (`zod`).

```bash
npm install salesdock
```

---

## Quick start

```ts
import { Salesdock } from "salesdock";

const sd = new Salesdock({
  domain: "testomgeving", // your Salesdock account sub-domain
  token: process.env.SALESDOCK_TOKEN!, // Bearer API token from your account admin
});

// Fetch products
const products = await sd.products.list({ business: 1 });

// Read a sale
const sale = await sd.sales.get(440);

// Create a sale on a flow
const { sale_id } = await sd.sales.createDefault("my-flow-type", "my-flow-id", {
  transaction_type: "offer",
  product_id: "1",
  firstname: "Jane",
  lastname: "Doe",
  email: "jane@example.com",
  questionData: { betaalwijze: "Automatische incasso" },
  agreements: { "privacy-statement": "1" },
});

// Paginate leads (auto-follows next_page_url)
for await (const lead of await sd.leads.list()) {
  console.log(lead.id);
}
```

---

## Configuration

```ts
const sd = new Salesdock({
  domain: "testomgeving",
  token: "…",

  // Optional:
  scope: "user", // "user" | "account" — default scope for scope-flexible endpoints
  version: "v1", // API version segment (default "v1")
  baseUrl: Salesdock.STAGING_BASE_URL, // default Salesdock.PRODUCTION_BASE_URL
  fetch: customFetch, // custom fetch implementation (default: global fetch)
  validateRequests: true, // validate inputs before sending (default true)
  validateResponses: true, // validate responses (default true)
  maxRetries: 2, // retries for 429/5xx/network errors (default 2)
  retryDelayMs: 500, // base backoff in ms (default 500)
  timeout: 60000, // per-request timeout in ms, 0 disables (default 60000)
  headers: { "X-My-Header": "1" }, // extra headers on every request
  onRequest: (req) => {}, // hook before each request
  onResponse: (res) => {}, // hook after each response
});
```

### The API path & scope

Every Salesdock URL has the shape:

```
https://app.salesdock.nl/api/{domain}/{version}/{scope}/{resource}
```

- **`domain`** — your account sub-domain (e.g. `testomgeving`), set once in the config.
- **`scope`** — `user` (your own data) or `account` (account-wide). Many endpoints accept either; the SDK uses your configured `scope`, overridable per-call:

  ```ts
  await sd.products.list({}, { scope: "account" });
  ```

  Endpoints that are fixed to one scope (e.g. webhooks are always `account`) ignore this and are handled automatically.

- **Environments** — production is the default. For staging:

  ```ts
  new Salesdock({ domain, token, baseUrl: Salesdock.STAGING_BASE_URL });
  ```

### Authentication

The SDK sends `Authorization: Bearer <token>` on every request. Tokens are created by your account admin and may be IP-restricted.

---

## What you can do

Each Salesdock module is a property on the client.

| Property          | Module        | Highlights                                                                                                                                                               |
| ----------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sd.sales`        | Sales         | `list`, `get`, `getContract`, `getAnswers`, `listByExportTemplate`, `createDefault`, `createDefaultMultiple`, `updateDefaultProposal`, `updateDefaultFinalized`, `listStatuses`, `updateStatus`, `updateStatusByIncoming`, `updateFields`, `updateFieldsByIncoming`, `cancel`, `getOfLead`, `getProducts`, `getOfFormInstance`, `getDocuments`, `getHistory`, `createOptin`, `listFlows`, `getFlow`, `listProductQuestions`, `getProductQuestion`, `listAgreements`, `getAgreement`, `createSale` (raw) |
| `sd.sales.energy` | Energy        | `nl.create`, `nl.listProducts`, `nl.getProduct`, `nl.updateProduct`, `be.create`, `be.listProducts`, `listSales`, `estimateUsage`                                          |
| `sd.sales.telecom`| Telecom       | `create`, `updateProposal`, `updateFinalized`, `compare`                                                                                                                  |
| `sd.sales.hostedVoice` | Hosted Voice | `create`                                                                                                                                                              |
| `sd.sales.solar`  | Solar Panels  | `create`, `estimatePanels`, `compare`                                                                                                                                     |
| `sd.sales.heatPumps` | Heat Pumps | `create`, `updateProposal`, `updateFinalized`                                                                                                                             |
| `sd.dialer`       | Dialer        | `createConceptTransaction`, `createConceptTransactionWithOptin`, `getConceptTransactionFields`, `getConceptTransactionFieldsWithOptin`, `createConceptLead`, `getConceptLeadFields`, `getLastSale`, `getSales`, `getSaleViewUrl` |
| `sd.users`        | Users         | `list`, `invite`, `users.organisations.*`                                                                                                                                 |
| `sd.users.organisations` | Organisations | `list`, `get`, `create`, `update`, `delete`, `listProducts`                                                                                                         |
| `sd.commissions`  | Commissions   | `outgoing.list`, `outgoing.forSale`, `incoming.list`, `incoming.forSale`                                                                                                   |
| `sd.leads`        | Leads         | `list`, `get`, `listActivities`, `listSources`, `createAsAdmin`, `updateAsAdmin`, `createAsReseller`, `updateAsReseller`, `getFormPdf`, `getHistory`, `getResults`, `listResults`, `updateStatus`, `listForms`, `getFormElements`, `createFormInstance`, `listStatuses`, `townships.list` |
| `sd.forms`        | Forms         | `list`, `getElements`, `listInstances`, `getInstance`, `fillInstance`, `listInstancesBySale`, `getInstancePdf`, `listStatuses`                                             |
| `sd.relations`    | Relations     | `list`, `get`, `create`, `update`                                                                                                                                         |
| `sd.products`     | Products      | `list`, `get`, `create`, `update`, `delete`, `connectOrganisationToProducts`, `connectProductToOrganisations`, `suppliers.*`                                              |
| `sd.products.suppliers` | Suppliers | `list`, `get`, `create`, `update`, `delete`                                                                                                                           |
| `sd.tasks`        | Tasks         | `list`, `get`, `create`, `update`, `delete`                                                                                                                               |
| `sd.webhooks`     | Webhooks      | `listEvents`, `subscribe`, `listSubscriptions`, `unsubscribe`                                                                                                             |

Every method returns the unwrapped `data` of the Salesdock envelope, typed. Every method accepts a trailing `options` argument (`{ scope?, signal?, headers?, timeout? }`).

---

## Pagination

List endpoints that paginate return a `Page` object you can iterate or step through.

```ts
// Iterate every item across all pages (auto-follows next_page_url)
for await (const relation of await sd.relations.list({ q: "jansen" })) {
  console.log(relation.id);
}

// Or work page by page
const page = await sd.relations.list();
console.log(page.items, page.total, page.currentPage, page.hasNextPage);
const next = await page.nextPage(); // OffsetPage | null

// Collect everything into one array
const all = await (await sd.relations.list()).all();
```

Cursor-paginated endpoints (e.g. `sd.leads.list()`, `sd.tasks.list()`) return a `CursorPage` with the same `items` / `nextPage()` / `all()` / async-iteration API (no total count).

Non-paginated list endpoints (e.g. `sd.products.list()`) simply return an array.

---

## Errors

All failures throw a subclass of `SalesdockError`:

| Class                              | When                                       |
| ---------------------------------- | ------------------------------------------ |
| `SalesdockValidationError`         | HTTP `400` / `422` (with `.errors` map)    |
| `SalesdockAuthenticationError`     | HTTP `401`                                 |
| `SalesdockForbiddenError`          | HTTP `403`                                 |
| `SalesdockNotFoundError`           | HTTP `404`                                 |
| `SalesdockMethodNotAllowedError`   | HTTP `405`                                 |
| `SalesdockRateLimitError`          | HTTP `429` (throttling)                    |
| `SalesdockServerError`             | HTTP `5xx`                                 |
| `SalesdockConnectionError`         | Network failure                            |
| `SalesdockTimeoutError`            | Request timed out                          |
| `SalesdockInvalidRequestError`     | Your input failed local validation         |
| `SalesdockResponseValidationError` | Response did not match the expected schema  |

```ts
import { SalesdockValidationError, SalesdockRateLimitError } from "salesdock";

try {
  await sd.leads.createAsAdmin({ firstname: "Jane" /* … */ });
} catch (err) {
  if (err instanceof SalesdockValidationError) {
    console.error(err.errors); // { email: ["Het veld email is verplicht."], … }
  } else if (err instanceof SalesdockRateLimitError) {
    console.error("Throttled, retry after", err.retryAfterMs, "ms");
  }
}
```

> Local **input** validation (`SalesdockInvalidRequestError`) is thrown **synchronously** as you call the method (fail-fast on bad arguments). Using `try { await sd.x() } catch` handles both this and async errors.

---

## Retries & rate limiting

Salesdock throttles at **120 requests/minute** per IP+user. The SDK retries with exponential backoff (honoring the `Retry-After` header), but **never silently duplicates a write**:

- **HTTP 429 (throttling)** is retried for **any** method — the request was rejected before processing, so it's always safe.
- **5xx and network errors** are retried only for **idempotent** requests (`GET` by default). A failed `POST`/`PUT`/`PATCH`/`DELETE` is surfaced immediately rather than re-sent, so a transient 503 after the server already committed a write can't create a duplicate sale.
- **Timeouts and caller aborts** are never retried (a timeout is your deadline; an abort takes effect at once).

To opt a specific mutating call into retries (e.g. an idempotent endpoint, or one you guard with your own dedupe key), pass `idempotent: true`:

```ts
await sd.sales.createDefault(flowType, flowId, body, { idempotent: true });
```

Tune globally via `maxRetries` / `retryDelayMs`, or disable with `maxRetries: 0`.

---

## Validation

`salesdock` validates with Zod on both sides:

- **Requests** — your inputs are checked before sending, surfacing mistakes locally instead of as a server `422`.
- **Responses** — validated as they arrive, but with **passthrough** semantics: unknown or newly-added fields flow through untouched, so the SDK doesn't break when Salesdock adds fields.

Disable either independently:

```ts
new Salesdock({ domain, token, validateResponses: false }); // skip response checks
new Salesdock({ domain, token, validateRequests: false }); // skip input checks
```

All schemas are exported (e.g. `RelationSchema`, `SaleSchema`, `EnergyNlSaleInputSchema`) if you want to validate elsewhere.

---

## Cloudflare Workers

No configuration needed — the global `fetch` is used automatically.

```ts
import { Salesdock } from "salesdock";

export interface Env {
  SALESDOCK_DOMAIN: string;
  SALESDOCK_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const sd = new Salesdock({
      domain: env.SALESDOCK_DOMAIN,
      token: env.SALESDOCK_TOKEN,
    });

    const sales = await sd.sales.list({ period: "last_30_days" });
    return Response.json(sales.items);
  },
} satisfies ExportedHandler<Env>;
```

Deno, Bun and modern browsers work the same way. On a runtime without a global `fetch`, pass one explicitly via `fetch`.

---

## Working with PDFs

Endpoints that return documents (sale contract, lead/form PDFs) deliver the file as a **base64 string**. Decode it to bytes with the included Web-standard helper:

```ts
import { decodeBase64 } from "salesdock";

const { contract } = await sd.sales.getContract(saleId);
if (contract?.content) {
  const bytes = decodeBase64(contract.content);
  // e.g. in a Worker:
  return new Response(bytes, { headers: { "content-type": "application/pdf" } });
}
```

---

## Escape hatch

For anything not covered by a typed method (or a custom query/body), use the raw request method. `segments` are the path parts after `/api/{domain}/{version}/` and include the scope yourself:

```ts
const data = await sd.request<MyType>("GET", ["account", "commissions", "outgoing"], {
  query: { page: 2 },
});
```

---

## Webhooks

Manage subscriptions via the API; Salesdock then POSTs events to your `target_url`.

```ts
const events = await sd.webhooks.listEvents(); // ["offer.accepted", "lead.created", …]
await sd.webhooks.subscribe({ event: "offer.accepted", target_url: "https://example.com/hook" });
const subs = await sd.webhooks.listSubscriptions();
await sd.webhooks.unsubscribe(subs[0].uuid);
```

---

## Development

```bash
npm install
npm run typecheck       # type-check the source
npm run typecheck:test  # type-check source + tests
npm test                # run the vitest suite
npm run build           # build dual ESM + CJS + d.ts into dist/
npm run format          # prettier
```

## License

`salesdock` is **dual-licensed**:

- **Open source — [GNU AGPL-3.0](LICENSE).** Free to use, modify and distribute, provided you meet the AGPL's terms. Note §13: if you run a modified version as a network service, you must offer its complete source to your users. Best for open-source projects and evaluation.
- **Commercial.** For use in **proprietary / closed-source** software or hosted services **without** the AGPL's source-disclosure obligations, a commercial license is available. See **[COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md)** or contact [Risker](https://risker.nl).

`salesdock` is an independent, unofficial client library and is not affiliated with or endorsed by Salesdock.

---

Built and maintained by [Risker](https://risker.nl).
