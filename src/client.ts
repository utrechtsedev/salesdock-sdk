import { z } from "zod";
import {
  resolveConfig,
  PRODUCTION_BASE_URL,
  STAGING_BASE_URL,
  type ResolvedConfig,
  type SalesdockConfig,
} from "./core/config.js";
import { HttpClient } from "./core/http.js";
import type { QueryParams, RequestOptions } from "./core/types.js";
import { SalesClient } from "./resources/sales.js";
import { DialerClient } from "./resources/dialer.js";
import { UsersClient } from "./resources/users.js";
import { CommissionsClient } from "./resources/commissions.js";
import { LeadsClient } from "./resources/leads.js";
import { FormsClient } from "./resources/forms.js";
import { RelationsClient } from "./resources/relations.js";
import { ProductsClient } from "./resources/products.js";
import { TasksClient } from "./resources/tasks.js";
import { WebhooksClient } from "./resources/webhooks.js";

/** Options for {@link Salesdock.request}, the low-level escape hatch. */
export interface RawRequestInit {
  query?: QueryParams;
  body?: unknown;
  options?: RequestOptions;
}

/**
 * The Salesdock API client.
 *
 * Universal and dependency-light: it talks to the API over the Web-standard
 * `fetch`, so the same client runs on Node.js 18+, Cloudflare Workers, Deno,
 * Bun and the browser.
 *
 * @example
 * ```ts
 * import { Salesdock } from "salesdock";
 *
 * const sd = new Salesdock({ domain: "testomgeving", token: process.env.SALESDOCK_TOKEN! });
 *
 * const products = await sd.products.list({ business: 1 });
 * const sale = await sd.sales.get(440);
 * for await (const lead of await sd.leads.list()) {
 *   console.log(lead.id);
 * }
 * ```
 */
export class Salesdock {
  /** Production base URL (`https://app.salesdock.nl`). */
  static readonly PRODUCTION_BASE_URL = PRODUCTION_BASE_URL;
  /** Staging base URL (`https://app-staging.salesdock.nl`). */
  static readonly STAGING_BASE_URL = STAGING_BASE_URL;

  /** The resolved configuration in use (all defaults applied). */
  readonly config: ResolvedConfig;
  /** The underlying transport. Use {@link request} for ad-hoc calls. */
  readonly http: HttpClient;

  /** Sales API — create/retrieve sales, statuses, flows, agreements, … */
  readonly sales: SalesClient;
  /** Dialer API — concept transactions, concept leads, sale view URLs. */
  readonly dialer: DialerClient;
  /** Users API — users, invitations and organisations. */
  readonly users: UsersClient;
  /** Commissions API — incoming and outgoing commissions. */
  readonly commissions: CommissionsClient;
  /** Leads API — leads, results, sources, forms and townships. */
  readonly leads: LeadsClient;
  /** Forms API — forms, elements, instances and PDFs. */
  readonly forms: FormsClient;
  /** Relations API — customer/relation records. */
  readonly relations: RelationsClient;
  /** Products API — product catalog and suppliers. */
  readonly products: ProductsClient;
  /** Tasks API — task management. */
  readonly tasks: TasksClient;
  /** Webhooks API — event subscriptions. */
  readonly webhooks: WebhooksClient;

  constructor(config: SalesdockConfig) {
    this.config = resolveConfig(config);
    this.http = new HttpClient(this.config);

    this.sales = new SalesClient(this.http, this.config);
    this.dialer = new DialerClient(this.http, this.config);
    this.users = new UsersClient(this.http, this.config);
    this.commissions = new CommissionsClient(this.http, this.config);
    this.leads = new LeadsClient(this.http, this.config);
    this.forms = new FormsClient(this.http, this.config);
    this.relations = new RelationsClient(this.http, this.config);
    this.products = new ProductsClient(this.http, this.config);
    this.tasks = new TasksClient(this.http, this.config);
    this.webhooks = new WebhooksClient(this.http, this.config);
  }

  /**
   * Low-level escape hatch for endpoints (or query/body shapes) not covered by
   * a typed method. `segments` are the path parts after
   * `/api/{domain}/{version}/` and must include the scope segment yourself
   * (e.g. `["account", "sales", 440]`). The response `data` is returned as-is.
   *
   * @example
   * ```ts
   * const data = await sd.request("GET", ["account", "commissions", "outgoing"]);
   * ```
   */
  request<T = unknown>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    segments: Array<string | number>,
    init: RawRequestInit = {},
  ): Promise<T> {
    return this.http.request({
      method,
      segments,
      dataSchema: z.unknown(),
      query: init.query,
      body: init.body,
      options: init.options,
    }) as Promise<T>;
  }
}
