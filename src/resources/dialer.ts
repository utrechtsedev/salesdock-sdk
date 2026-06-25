import { z } from "zod";
import { BaseResource } from "./base.js";
import { idSchema, loose, nullish } from "../schemas/common.js";
import type { RequestOptions } from "../core/types.js";

/**
 * Customer/personal fields shared by the concept-transaction and concept-lead
 * request bodies. Only `source` and `source_id` are required; everything else
 * is optional. Extra fields are sent as `cf_{identifier}` keys (handled by the
 * `.passthrough()` on each input schema).
 */
const baseConceptFields = {
  /** The name of the dialer company in lower case (max 20 chars). */
  source: z.string(),
  /** A unique identifier for the record on the dialer platform. */
  source_id: z.union([z.string(), z.number()]),
  /** Gender of the customer: `"male"` or `"female"`. */
  gender: z.string().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  /** Date of birth in `dd-mm-yyyy` format. */
  birthdate: z.string().optional(),
  email: z.string().optional(),
  /** `1` for business, `0` for consumer. */
  customer_type: z.union([z.string(), z.number()]).optional(),
  company_name: z.string().optional(),
  contact_person: z.string().optional(),
  coc: z.string().optional(),
  postcode: z.string().optional(),
  housenumber: z.union([z.string(), z.number()]).optional(),
  suffix: z.string().optional(),
  streetname: z.string().optional(),
  city: z.string().optional(),
  /** Country code: `"NL"` or `"BE"`. */
  country: z.string().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
} as const;

/** A single opt-in channel attached to a concept transaction. */
export const OptinChannelInputSchema = z
  .object({
    /** Channel type: `"email"` or `"phone"`. */
    type: z.string(),
    /** Email address or phone number, matching `type`. */
    value: z.string(),
    /** Topic(s) the customer has opted in for. */
    topic: z.string().optional(),
    /** When the opt-in was verified (phone double opt-in). */
    verified_at: z.string().optional(),
    /** IP address from which the opt-in was verified. */
    verified_ip: z.string().optional(),
    /** Verification method: `"sms"`, `"call"` or `"whatsapp"`. */
    verified_method: z.string().optional(),
  })
  .passthrough();
export type OptinChannelInput = z.input<typeof OptinChannelInputSchema>;

/** Body for {@link DialerClient.createConceptTransaction}. */
export const CreateConceptTransactionSchema = z
  .object({
    ...baseConceptFields,
    /** Integer version of the source row (1-255). */
    source_version: z.union([z.string(), z.number()]).optional(),
    /** Arbitrary metadata associated with the source row. */
    source_metadata: z.unknown().optional(),
  })
  .passthrough();
export type CreateConceptTransactionInput = z.input<typeof CreateConceptTransactionSchema>;

/** Body for {@link DialerClient.createConceptTransactionWithOptin}. */
export const CreateConceptTransactionWithOptinSchema = z
  .object({
    ...baseConceptFields,
    source_version: z.union([z.string(), z.number()]).optional(),
    source_metadata: z.unknown().optional(),
    /** `1` to create an opt-in, `0` otherwise. */
    optin: z.union([z.string(), z.number()]).optional(),
    optin_source: z.string().optional(),
    /** When the opt-in was obtained (`yyyy-mm-dd HH:mm:ss`). */
    optin_obtained_at: z.string().optional(),
    optin_obtained_by: z.string().optional(),
    optin_obtained_system: z.string().optional(),
    optin_obtained_via_url: z.string().optional(),
    optin_client_ip: z.string().optional(),
    /** Until when the opt-in is valid (`yyyy-mm-dd HH:mm:ss`). */
    optin_valid_till: z.string().optional(),
    /** When the opt-in was withdrawn (`yyyy-mm-dd HH:mm:ss`). */
    optin_withdrawn_at: z.string().optional(),
    optin_remarks: z.string().optional(),
    optin_campaign_code: z.string().optional(),
    /** Proof of the opt-in as a base64 document plus its extension. */
    optin_proof: z
      .object({
        content: z.string().optional(),
        extension: z.string().optional(),
      })
      .passthrough()
      .optional(),
    /** The channels (at least one) the customer has opted in for. */
    optin_channels: z.array(OptinChannelInputSchema).optional(),
  })
  .passthrough();
export type CreateConceptTransactionWithOptinInput = z.input<
  typeof CreateConceptTransactionWithOptinSchema
>;

/** Body for {@link DialerClient.createConceptLead}. */
export const CreateConceptLeadSchema = z.object({ ...baseConceptFields }).passthrough();
export type CreateConceptLeadInput = z.input<typeof CreateConceptLeadSchema>;

/** Result of creating a concept transaction. */
export const ConceptTransactionResultSchema = loose({
  uuid: z.string(),
  order_url: nullish(z.string()),
  offer_url: nullish(z.string()),
});
export type ConceptTransactionResult = z.infer<typeof ConceptTransactionResultSchema>;

/** Result of creating a concept lead. */
export const ConceptLeadResultSchema = loose({
  uuid: z.string(),
  agenda_url: nullish(z.string()),
  lead_url: nullish(z.string()),
});
export type ConceptLeadResult = z.infer<typeof ConceptLeadResultSchema>;

/** A single supported field as described by the `/fields` endpoints. */
export const ConceptFieldSchema = loose({
  name: z.string(),
  type: nullish(z.string()),
  required: nullish(z.boolean()),
  description: nullish(z.string()),
  validations: z.array(z.string()).optional(),
});
export type ConceptField = z.infer<typeof ConceptFieldSchema>;

/** The fields + validators payload returned by the `/fields` endpoints. */
export const ConceptFieldsSchema = loose({
  fields: z.array(ConceptFieldSchema),
  validators: z.record(z.string(), z.string()).optional(),
});
export type ConceptFields = z.infer<typeof ConceptFieldsSchema>;

/** Result of {@link DialerClient.getLastSale}. */
export const LastSaleSchema = loose({
  sale_id: idSchema,
});
export type LastSale = z.infer<typeof LastSaleSchema>;

/** Result of {@link DialerClient.getSales}. */
export const ConceptTransactionSalesSchema = loose({
  sale_ids: z.array(idSchema),
});
export type ConceptTransactionSales = z.infer<typeof ConceptTransactionSalesSchema>;

/** Result of {@link DialerClient.getSaleViewUrl}. */
export const SaleViewUrlSchema = loose({
  admin: nullish(z.string()),
  reseller: nullish(z.string()),
});
export type SaleViewUrl = z.infer<typeof SaleViewUrlSchema>;

/** Query parameters for {@link DialerClient.getLastSale}. */
export interface GetLastSaleParams {
  /** The source id used to create the concept transaction. */
  source_id?: string | number;
  /** The uuid returned when the concept transaction was created. */
  uuid?: string;
}

/** Query parameters for {@link DialerClient.getSales}. */
export interface GetSalesParams {
  /** The source id used to create the concept transaction. */
  source_id?: string | number;
  /** The uuid returned when the concept transaction was created. */
  uuid?: string;
}

/**
 * Dialer API — create concept transactions and leads (temporary, prefilled
 * records used by dialer software) and look up the sales they produced. All
 * endpoints use the hard-coded `account` scope.
 */
export class DialerClient extends BaseResource {
  /** Create a concept transaction and get the prefilled order/offer URLs. */
  createConceptTransaction(
    input: CreateConceptTransactionInput,
    options?: RequestOptions,
  ): Promise<ConceptTransactionResult> {
    const body = this.parseInput(
      CreateConceptTransactionSchema,
      input,
      "dialer.createConceptTransaction",
    );
    return this.http.request({
      method: "POST",
      segments: ["account", "concepttransaction"],
      dataSchema: ConceptTransactionResultSchema,
      body,
      options,
    });
  }

  /** Create a concept transaction together with opt-in information. */
  createConceptTransactionWithOptin(
    input: CreateConceptTransactionWithOptinInput,
    options?: RequestOptions,
  ): Promise<ConceptTransactionResult> {
    const body = this.parseInput(
      CreateConceptTransactionWithOptinSchema,
      input,
      "dialer.createConceptTransactionWithOptin",
    );
    return this.http.request({
      method: "POST",
      segments: ["account", "concepttransaction"],
      dataSchema: ConceptTransactionResultSchema,
      body,
      options,
    });
  }

  /** List the fields supported when creating a concept transaction. */
  getConceptTransactionFields(options?: RequestOptions): Promise<ConceptFields> {
    return this.http.request({
      method: "GET",
      segments: ["account", "concepttransaction", "fields"],
      dataSchema: ConceptFieldsSchema,
      options,
    });
  }

  /** List the concept-transaction fields including the opt-in fields. */
  getConceptTransactionFieldsWithOptin(options?: RequestOptions): Promise<ConceptFields> {
    return this.http.request({
      method: "GET",
      segments: ["account", "concepttransaction", "fields", "optin"],
      dataSchema: ConceptFieldsSchema,
      options,
    });
  }

  /** Create a concept lead and get the prefilled agenda/lead URLs. */
  createConceptLead(
    input: CreateConceptLeadInput,
    options?: RequestOptions,
  ): Promise<ConceptLeadResult> {
    const body = this.parseInput(CreateConceptLeadSchema, input, "dialer.createConceptLead");
    return this.http.request({
      method: "POST",
      segments: ["account", "conceptlead"],
      dataSchema: ConceptLeadResultSchema,
      body,
      options,
    });
  }

  /** List the fields supported when creating a concept lead. */
  getConceptLeadFields(options?: RequestOptions): Promise<ConceptFields> {
    return this.http.request({
      method: "GET",
      segments: ["account", "conceptlead", "fields"],
      dataSchema: ConceptFieldsSchema,
      options,
    });
  }

  /**
   * Get the last sale id created from a concept transaction. At least one of
   * `source_id` or `uuid` must be provided.
   */
  getLastSale(
    source: string,
    params: GetLastSaleParams = {},
    options?: RequestOptions,
  ): Promise<LastSale> {
    return this.http.request({
      method: "GET",
      segments: ["account", "concepttransaction", "sale_id", source],
      dataSchema: LastSaleSchema,
      query: {
        source_id: params.source_id,
        uuid: params.uuid,
      },
      options,
    });
  }

  /**
   * Get all sale ids created from a concept transaction. At least one of
   * `source_id` or `uuid` must be provided.
   */
  getSales(
    source: string,
    params: GetSalesParams = {},
    options?: RequestOptions,
  ): Promise<ConceptTransactionSales> {
    return this.http.request({
      method: "GET",
      segments: ["account", "concepttransaction", "sales", source],
      dataSchema: ConceptTransactionSalesSchema,
      query: {
        source_id: params.source_id,
        uuid: params.uuid,
      },
      options,
    });
  }

  /** Get the admin/reseller URLs for viewing a sale by id. */
  getSaleViewUrl(saleId: number | string, options?: RequestOptions): Promise<SaleViewUrl> {
    return this.http.request({
      method: "GET",
      segments: ["account", "sales", "url", saleId],
      dataSchema: SaleViewUrlSchema,
      options,
    });
  }
}
