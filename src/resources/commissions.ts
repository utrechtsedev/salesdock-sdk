import { z } from "zod";
import { BaseResource } from "./base.js";
import { idSchema, loose, nullish } from "../schemas/common.js";
import type { HttpClient } from "../core/http.js";
import type { ResolvedConfig } from "../core/config.js";
import type { QueryParams, RequestOptions } from "../core/types.js";

/** A single commission line as returned in commission list responses. */
export const CommissionSchema = loose({
  sale_id: nullish(idSchema),
  partner_type: nullish(z.string()),
  product_id: nullish(idSchema),
  commission_plan: nullish(z.string()),
  description: nullish(z.string()),
  payout_percentage: nullish(z.union([z.string(), z.number()])),
  currency: nullish(z.string()),
  amount: nullish(z.union([z.string(), z.number()])),
  recurring_type: nullish(z.string()),
  recurring_count: nullish(z.union([z.string(), z.number()])),
  run_count: nullish(z.union([z.string(), z.number()])),
});
export type Commission = z.infer<typeof CommissionSchema>;

/** The numeric breakdown (`total`/`pending`/`final`) inside a `totals` block. */
export const CommissionTotalsBreakdownSchema = loose({
  total: nullish(z.number()),
  pending: nullish(z.number()),
  final: nullish(z.number()),
});
export type CommissionTotalsBreakdown = z.infer<typeof CommissionTotalsBreakdownSchema>;

/** Aggregated commission totals (`amounts` and `counts`). */
export const CommissionTotalsSchema = loose({
  amounts: CommissionTotalsBreakdownSchema.optional(),
  counts: CommissionTotalsBreakdownSchema.optional(),
});
export type CommissionTotals = z.infer<typeof CommissionTotalsSchema>;

/** A commissions response: the `items` plus an optional aggregated `totals`. */
export const CommissionListSchema = loose({
  items: z.array(CommissionSchema),
  totals: CommissionTotalsSchema.nullish(),
});
export type CommissionList = z.infer<typeof CommissionListSchema>;

/** Query parameters for the commission `list` methods. */
export interface ListCommissionsParams {
  /** Page number, when the endpoint paginates results. */
  page?: number;
}

/** Outgoing commissions (commissions your account pays out). */
export class OutgoingCommissionsClient extends BaseResource {
  /** List all outgoing commissions (always `account` scope). */
  list(params: ListCommissionsParams = {}, options?: RequestOptions): Promise<CommissionList> {
    return this.http.request({
      method: "GET",
      segments: ["account", "commissions", "outgoing"],
      dataSchema: CommissionListSchema,
      query: params as QueryParams,
      options,
    });
  }

  /** Get the outgoing commissions of a single sale (always `account` scope). */
  forSale(saleId: number | string, options?: RequestOptions): Promise<CommissionList> {
    return this.http.request({
      method: "GET",
      segments: ["account", "commissions", "outgoing", saleId],
      dataSchema: CommissionListSchema,
      options,
    });
  }
}

/** Incoming commissions (commissions your account receives). */
export class IncomingCommissionsClient extends BaseResource {
  /** List all incoming commissions (always `account` scope). */
  list(params: ListCommissionsParams = {}, options?: RequestOptions): Promise<CommissionList> {
    return this.http.request({
      method: "GET",
      segments: ["account", "commissions", "incoming"],
      dataSchema: CommissionListSchema,
      query: params as QueryParams,
      options,
    });
  }

  /** Get the incoming commissions of a single sale (always `account` scope). */
  forSale(saleId: number | string, options?: RequestOptions): Promise<CommissionList> {
    return this.http.request({
      method: "GET",
      segments: ["account", "commissions", "incoming", saleId],
      dataSchema: CommissionListSchema,
      options,
    });
  }
}

/**
 * Commissions API — read outgoing and incoming commissions. All endpoints use
 * the `account` scope. Access the two directions via the {@link outgoing} and
 * {@link incoming} sub-clients.
 */
export class CommissionsClient extends BaseResource {
  /** Outgoing commissions (paid out by your account). */
  readonly outgoing: OutgoingCommissionsClient;
  /** Incoming commissions (received by your account). */
  readonly incoming: IncomingCommissionsClient;

  constructor(http: HttpClient, config: ResolvedConfig) {
    super(http, config);
    this.outgoing = new OutgoingCommissionsClient(http, config);
    this.incoming = new IncomingCommissionsClient(http, config);
  }
}
