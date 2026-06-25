import { z } from "zod";
import { BaseResource } from "./base.js";
import { loose, nullish, idSchema, customerSchema, statusSchema } from "../schemas/common.js";
import { fetchOffsetPage, type OffsetPage } from "../core/pagination.js";
import type { HttpClient } from "../core/http.js";
import type { ResolvedConfig } from "../core/config.js";
import type { QueryParams, RequestOptions } from "../core/types.js";

/* -------------------------------------------------------------------------- */
/*                              Shared schemas                                */
/* -------------------------------------------------------------------------- */

/** Result of any sale-creation endpoint. */
export const CreateSaleResultSchema = loose({ sale_id: idSchema });
export type CreateSaleResult = z.infer<typeof CreateSaleResultSchema>;

/** Result of a proposal/finalized-sale update endpoint. */
export const MutateSaleResultSchema = loose({ sale_id: idSchema });
export type MutateSaleResult = z.infer<typeof MutateSaleResultSchema>;

/** Common customer/connection fields shared by the create-sale flow bodies. */
const saleCreateBaseShape = {
  transaction_type: z.enum(["offer", "order"]).optional(),
  sale_channel: z.string().optional(),
  product_id: z.union([z.string(), z.number()]).optional(),
  // Customer
  gender: z.string().optional(),
  firstname: z.string().optional(),
  lastname: z.string().optional(),
  birthdate: z.string().nullable().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  contact_person: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  company_coc: z.string().nullable().optional(),
  company_coc_branch_number: z.string().nullable().optional(),
  company_vat: z.string().nullable().optional(),
  iban: z.string().optional(),
  iban_holder: z.string().optional(),
  business: z.union([z.string(), z.number(), z.boolean()]).optional(),
  // Address
  postcode: z.string().optional(),
  housenumber: z.union([z.string(), z.number()]).optional(),
  suffix: z.string().nullable().optional(),
  streetname: z.string().optional(),
  city: z.string().optional(),
  // Connection address
  connection_postcode: z.string().optional(),
  connection_housenumber: z.union([z.string(), z.number()]).optional(),
  connection_suffix: z.string().nullable().optional(),
  connection_streetname: z.string().optional(),
  connection_city: z.string().optional(),
  // Misc
  valid_till: z.string().optional(),
  signature: z.string().optional(),
  initial_user_firstname: z.string().optional(),
  initial_user_lastname: z.string().optional(),
  initial_organisation_name: z.string().optional(),
  // Free-form question answers and agreement acceptances (identifier -> value)
  questionData: z.record(z.string(), z.unknown()).optional(),
  agreements: z.record(z.string(), z.unknown()).optional(),
} satisfies z.ZodRawShape;

const energyFieldsShape = {
  type: z.string().optional(),
  has_return: z.union([z.string(), z.number()]).optional(),
  building_function: z.union([z.string(), z.number()]).optional(),
  return: z.union([z.string(), z.number()]).optional(),
  return_e_high: z.union([z.string(), z.number()]).optional(),
  return_e_low: z.union([z.string(), z.number()]).optional(),
  usage_e_single: z.union([z.string(), z.number()]).nullable().optional(),
  usage_e_high: z.union([z.string(), z.number()]).nullable().optional(),
  usage_e_low: z.union([z.string(), z.number()]).nullable().optional(),
  usage_g: z.union([z.string(), z.number()]).nullable().optional(),
  tarifftype: z.union([z.string(), z.number()]).optional(),
  e_gridoperator: z.string().optional(),
  g_gridoperator: z.string().optional(),
  e_connection_type: z.string().optional(),
  g_connection_type: z.string().optional(),
  g_region: z.string().optional(),
  electricity_ean: z.string().nullable().optional(),
  gas_ean: z.string().nullable().optional(),
  delivery_mainly_private: z.union([z.string(), z.number()]).optional(),
} satisfies z.ZodRawShape;

/** Body for creating an energy sale on a NL flow. */
export const EnergyNlSaleInputSchema = z
  .object({ ...saleCreateBaseShape, ...energyFieldsShape })
  .passthrough();
export type EnergyNlSaleInput = z.input<typeof EnergyNlSaleInputSchema>;

/** Body for creating an energy sale on a BE flow. */
export const EnergyBeSaleInputSchema = z
  .object({
    ...saleCreateBaseShape,
    ...energyFieldsShape,
    e_measurement_frequency: z.string().optional(),
    g_measurement_frequency: z.string().optional(),
    exclusive_night: z.union([z.string(), z.number()]).optional(),
    usage_e_exclusive: z.union([z.string(), z.number()]).optional(),
    region: z.string().optional(),
    e_grid_operator: z.string().optional(),
    g_grid_operator: z.string().optional(),
  })
  .passthrough();
export type EnergyBeSaleInput = z.input<typeof EnergyBeSaleInputSchema>;

/** Related products map/array used by telecom/hosted-voice/multi-product sales. */
const relatedProductsSchema = z
  .union([z.record(z.string(), z.unknown()), z.array(z.unknown())])
  .optional();

/** Body for creating a telecom sale. */
export const TelecomSaleInputSchema = z
  .object({ ...saleCreateBaseShape, related_products: relatedProductsSchema })
  .passthrough();
export type TelecomSaleInput = z.input<typeof TelecomSaleInputSchema>;

/** Body for creating a hosted-voice sale. */
export const HostedVoiceSaleInputSchema = z
  .object({
    ...saleCreateBaseShape,
    includes_internet: z.union([z.string(), z.number()]).optional(),
    related_products: relatedProductsSchema,
  })
  .passthrough();
export type HostedVoiceSaleInput = z.input<typeof HostedVoiceSaleInputSchema>;

/** Body for creating a solar-panel sale. */
export const SolarSaleInputSchema = z
  .object({
    ...saleCreateBaseShape,
    sell_type: z.string().optional(),
    usage: z.union([z.string(), z.number()]).optional(),
    building_type: z.string().optional(),
    household_size: z.union([z.string(), z.number()]).optional(),
    address: z.string().optional(),
    country: z.string().optional(),
    area: z.union([z.string(), z.number()]).optional(),
    panel_product: z.union([z.string(), z.number()]).optional(),
    panel_count: z.union([z.string(), z.number()]).optional(),
    option_products: z.array(z.unknown()).optional(),
  })
  .passthrough();
export type SolarSaleInput = z.input<typeof SolarSaleInputSchema>;

/** Body for creating a heat-pump sale. */
export const HeatPumpSaleInputSchema = z
  .object({
    ...saleCreateBaseShape,
    sell_type: z.string().optional(),
    number_of_persons: z.union([z.string(), z.number()]).optional(),
    electricity_usage: z.union([z.string(), z.number()]).optional(),
    gas_usage: z.union([z.string(), z.number()]).optional(),
    heating_system: z.string().optional(),
    gas_usage_tap_water_per_person: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();
export type HeatPumpSaleInput = z.input<typeof HeatPumpSaleInputSchema>;

/** Body for creating a default (generic) sale. */
export const DefaultSaleInputSchema = z.object(saleCreateBaseShape).passthrough();
export type DefaultSaleInput = z.input<typeof DefaultSaleInputSchema>;

/** Body for creating a default sale with multiple products. */
export const MultiProductSaleInputSchema = z
  .object({
    ...saleCreateBaseShape,
    related_products: z
      .array(
        z
          .object({
            product_id: z.union([z.string(), z.number()]),
            quantity: z.union([z.string(), z.number()]).optional(),
            section_identifier: z.string().optional(),
          })
          .passthrough(),
      )
      .optional(),
  })
  .passthrough();
export type MultiProductSaleInput = z.input<typeof MultiProductSaleInputSchema>;

/** A `{ delete: [...], upsert: {...} }` mutation block used in proposal updates. */
const mutationBlockSchema = z
  .object({
    delete: z.array(z.union([z.string(), z.number()])).optional(),
    upsert: z.unknown().optional(),
  })
  .passthrough();

/** Body for updating a sale proposal or finalized sale (telecom/default/heat-pump). */
export const UpdateSaleInputSchema = z
  .object({
    product_id: z.union([z.string(), z.number()]).optional(),
    valid_till: z.string().optional(),
    customer: z
      .object({
        business: z.union([z.boolean(), z.string(), z.number()]).optional(),
        gender: z.string().optional(),
        firstname: z.string().optional(),
        lastname: z.string().optional(),
        birthdate: z.string().nullable().optional(),
        email: z.string().optional(),
        phone: z.string().nullable().optional(),
        company_name: z.string().nullable().optional(),
        contact_person: z.string().nullable().optional(),
        coc: z.string().nullable().optional(),
        vat: z.string().nullable().optional(),
        address: z.record(z.string(), z.unknown()).optional(),
        correspondence_address: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
    product_questions: mutationBlockSchema.optional(),
    agreements: mutationBlockSchema.optional(),
  })
  .passthrough();
export type UpdateSaleInput = z.input<typeof UpdateSaleInputSchema>;

/** Body for updating an energy product's tariffs. */
export const UpdateEnergyProductInputSchema = z
  .object({
    type: z.string().optional(),
    active: z.union([z.string(), z.number()]).optional(),
    valid_from: z.string().optional(),
    valid_till: z.string().optional(),
    tariff_single: z.string().optional(),
    tariff_high: z.string().optional(),
    tariff_low: z.string().optional(),
    tariff_high_t2: z.string().optional(),
    tariff_low_t2: z.string().optional(),
    tariff_return: z.string().optional(),
    tariff_return_high: z.string().optional(),
    tariff_return_low: z.string().optional(),
    tariff_fixed_e: z.string().optional(),
    g_region_tax_level: z.string().optional(),
    tariff_g: z.string().optional(),
    tariff_g_g2: z.string().optional(),
    tariff_fixed_g: z.string().optional(),
    product_type: z.string().optional(),
  })
  .passthrough();
export type UpdateEnergyProductInput = z.input<typeof UpdateEnergyProductInputSchema>;

/** Body for updating a sale's extra field values (identifier -> value). */
export const UpdateSaleFieldsInputSchema = z.record(z.string(), z.unknown());
export type UpdateSaleFieldsInput = z.input<typeof UpdateSaleFieldsInputSchema>;

/** Body for creating an opt-in for a sale. */
export const CreateOptinInputSchema = z.record(z.string(), z.unknown());
export type CreateOptinInput = z.input<typeof CreateOptinInputSchema>;

/* -------------------------------- Responses ------------------------------- */

/** A sale as returned in the paginated sales list. */
export const SaleListItemSchema = loose({
  id: idSchema,
  user_id: nullish(idSchema),
  type: nullish(z.string()),
  sub_type: nullish(z.string()),
  offer: nullish(z.unknown()),
  offer_accepted: nullish(z.unknown()),
  status: nullish(z.union([z.string(), statusSchema])),
  verification: nullish(z.unknown()),
  flow_id: nullish(idSchema),
  product_id: nullish(idSchema),
  incoming_id: nullish(idSchema),
  created_at: nullish(z.string()),
  finalized_at: nullish(z.string()),
  updated_at: nullish(z.string()),
  valid_till: nullish(z.string()),
  firstname: nullish(z.string()),
  lastname: nullish(z.string()),
  email: nullish(z.string()),
  phone: nullish(z.string()),
  product_name: nullish(z.string()),
  supplier_name: nullish(z.string()),
  lead_id: nullish(idSchema),
  relation_id: nullish(idSchema),
});
export type SaleListItem = z.infer<typeof SaleListItemSchema>;

/** A full sale record. */
export const SaleSchema = loose({
  id: idSchema,
  type: nullish(z.string()),
  status: statusSchema.optional(),
  offer_accepted: nullish(z.boolean()),
  offer_valid_till: nullish(z.string()),
  created_at: nullish(z.string()),
  finalized_at: nullish(z.string()),
  updated_at: nullish(z.string()),
  channel: nullish(z.string()),
  source: nullish(z.string()),
  customer: customerSchema.optional(),
});
export type Sale = z.infer<typeof SaleSchema>;

/** A row from the energy-sales / export-template listing (dynamic column keys). */
export const SaleExportRowSchema = z.record(z.string(), z.unknown());
export type SaleExportRow = z.infer<typeof SaleExportRowSchema>;

/** A flow summary as returned in the flows list. */
export const FlowListItemSchema = loose({
  id: idSchema,
  title: nullish(z.string()),
  type: nullish(z.string()),
  identifier: nullish(z.string()),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
});
export type FlowListItem = z.infer<typeof FlowListItemSchema>;

/** A full flow record. */
export const FlowSchema = loose({
  id: idSchema,
  title: nullish(z.string()),
  type: nullish(z.string()),
  identifier: nullish(z.string()),
  transaction_type: nullish(z.string()),
  verification_method: nullish(z.string()),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
});
export type Flow = z.infer<typeof FlowSchema>;

/** A product question summary. */
export const ProductQuestionListItemSchema = loose({
  id: idSchema,
  name: nullish(z.string()),
  identifier: nullish(z.string()),
  input_type: nullish(z.string()),
  description: nullish(z.string()),
});
export type ProductQuestionListItem = z.infer<typeof ProductQuestionListItemSchema>;

/** A full product question record. */
export const ProductQuestionSchema = loose({
  id: idSchema,
  name: nullish(z.string()),
  identifier: nullish(z.string()),
  input_type: nullish(z.string()),
  description: nullish(z.string()),
  required: nullish(z.unknown()),
  visible: nullish(z.unknown()),
  options: nullish(z.unknown()),
  default_value: nullish(z.unknown()),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
});
export type ProductQuestion = z.infer<typeof ProductQuestionSchema>;

/** An agreement summary. */
export const AgreementListItemSchema = loose({
  id: idSchema,
  identifier: nullish(z.string()),
  name: nullish(z.string()),
  text: nullish(z.string()),
});
export type AgreementListItem = z.infer<typeof AgreementListItemSchema>;

/** A full agreement record. */
export const AgreementSchema = loose({
  id: idSchema,
  account_id: nullish(idSchema),
  name: nullish(z.string()),
  identifier: nullish(z.string()),
  text: nullish(z.string()),
  description: nullish(z.string()),
  type: nullish(z.string()),
  required: nullish(z.unknown()),
  created_at: nullish(z.string()),
});
export type Agreement = z.infer<typeof AgreementSchema>;

/** An energy product with tariff + calculation details (NL or BE). */
export const EnergyProductSchema = loose({
  id: idSchema,
  name: nullish(z.string()),
  identifier: nullish(z.string()),
  supplier_id: nullish(idSchema),
  type: nullish(z.string()),
  business: nullish(z.union([z.string(), z.number(), z.boolean()])),
  cost_specifications: nullish(z.unknown()),
  valid_from: nullish(z.string()),
  valid_till: nullish(z.string()),
});
export type EnergyProduct = z.infer<typeof EnergyProductSchema>;

/** A status entry in the sale statuses list. */
export const SaleStatusSchema = loose({
  source: nullish(z.string()),
  id: nullish(idSchema),
  name: nullish(z.string()),
  text: nullish(z.string()),
  type: nullish(z.string()),
  source_data: nullish(z.unknown()),
});
export type SaleStatus = z.infer<typeof SaleStatusSchema>;

/** A document attached to a sale. `location` is a download URL. */
export const SaleDocumentSchema = loose({
  name: nullish(z.string()),
  location: nullish(z.string()),
});
export type SaleDocument = z.infer<typeof SaleDocumentSchema>;

/** An entry in a sale's change history. */
export const SaleHistoryEntrySchema = loose({
  type: nullish(z.string()),
  modified_at: nullish(z.string()),
  previous_status: nullish(z.unknown()),
  new_status: nullish(z.unknown()),
  remark: nullish(z.string()),
  user: nullish(z.unknown()),
  type_data: nullish(z.unknown()),
});
export type SaleHistoryEntry = z.infer<typeof SaleHistoryEntrySchema>;

/** Products + totals breakdown for a sale. */
export const SaleProductsSchema = loose({
  sale_id: idSchema,
  products: nullish(z.unknown()),
  additional_costs: nullish(z.unknown()),
  discounts: nullish(z.unknown()),
  totals: nullish(z.unknown()),
});
export type SaleProducts = z.infer<typeof SaleProductsSchema>;

/** The sale linked to a lead. */
export const SaleOfLeadSchema = loose({ id: idSchema });
export type SaleOfLead = z.infer<typeof SaleOfLeadSchema>;

/** A sale's signed contract; `contract.content` is a base64 PDF. */
export const SaleContractSchema = loose({
  id: idSchema,
  contract: loose({ content: nullish(z.string()) }).optional(),
});
export type SaleContract = z.infer<typeof SaleContractSchema>;

/** An energy usage estimation result. */
export const EnergyUsageEstimationSchema = loose({
  type: nullish(z.string()),
  e_single: nullish(z.union([z.string(), z.number()])),
  e_high: nullish(z.union([z.string(), z.number()])),
  e_low: nullish(z.union([z.string(), z.number()])),
  gas: nullish(z.union([z.string(), z.number()])),
});
export type EnergyUsageEstimation = z.infer<typeof EnergyUsageEstimationSchema>;

/** A solar panels estimation result. */
export const PanelsEstimationSchema = loose({
  number_of_panels: nullish(z.union([z.string(), z.number()])),
});
export type PanelsEstimation = z.infer<typeof PanelsEstimationSchema>;

/** A telecom availability comparison result. */
export const TelecomCompareSchema = loose({
  address: nullish(z.unknown()),
  bandwidth: nullish(z.unknown()),
  products: nullish(z.unknown()),
  options: nullish(z.unknown()),
});
export type TelecomCompare = z.infer<typeof TelecomCompareSchema>;

/** A solar comparison package result. */
export const SolarComparePackageSchema = loose({ packages: nullish(z.unknown()) });
export type SolarComparePackage = z.infer<typeof SolarComparePackageSchema>;

/* ------------------------------- Param types ------------------------------ */

/** Query parameters for {@link SalesClient.list}. */
export interface ListSalesParams {
  period_filter_on?: string;
  period?: string;
  period_start?: string;
  period_end?: string;
  type?: string;
  supplier_id?: number | string;
  flow_id?: number | string;
  statuses?: Array<string | number>;
  offer_statuses?: Array<string | number>;
  product_types?: Array<string | number>;
  sale_ids?: Array<string | number>;
  organisations?: Array<string | number>;
  /** Only in `account` scope: include draft/concept sales. */
  include_concept_sales?: 0 | 1;
  page?: number;
}

/** Query parameters for the energy product tariff/calculation lookups (NL). */
export interface EnergyProductQueryParams {
  postcode?: string;
  housenumber?: string | number;
  suffix?: string;
  type?: string;
  tarifftype?: 0 | 1 | string;
  usage_e_single?: number | string;
  usage_e_high?: number | string;
  usage_e_low?: number | string;
  usage_g?: number | string;
  has_return?: 0 | 1 | string;
  return?: number | string;
  return_e_high?: number | string;
  return_e_low?: number | string;
  building_function?: 0 | 1 | string;
  e_gridoperator?: string;
  g_gridoperator?: string;
  e_connection_type?: string;
  g_connection_type?: string;
  flow_identifier?: string | number;
  business?: 0 | 1 | string;
  [key: string]: QueryParams[string];
}

/** Query parameters for the BE energy product tariff/calculation lookup. */
export interface EnergyBeProductQueryParams {
  postcode?: string;
  housenumber?: string | number;
  suffix?: string;
  type?: string;
  tarifftype?: 0 | 1 | string;
  usage_e_single?: number | string;
  usage_e_high?: number | string;
  usage_e_low?: number | string;
  usage_g?: number | string;
  has_return?: 0 | 1 | string;
  region?: string;
  e_grid_operator?: string;
  g_grid_operator?: string;
  exclusive_night?: 0 | 1 | string;
  usage_e_exclusive?: number | string;
  flow_identifier?: string | number;
  [key: string]: QueryParams[string];
}

/** Query parameters for {@link EnergyClient.estimateUsage}. */
export interface EnergyUsageEstimationParams {
  business?: 0 | 1;
  building_type?: string;
  household_size?: number | string;
  [key: string]: QueryParams[string];
}

/** Query parameters for {@link SolarClient.estimatePanels}. */
export interface PanelsEstimationParams {
  usage_electricity?: number | string;
  roof_type?: string;
  roof_orientation?: string;
  fuse_box_capacity?: string;
  roof_height?: number | string;
  roof_width?: number | string;
  panel_power?: number | string;
  powerfactor?: number | string;
  panel_orientation?: string;
  panel_width?: number | string;
  panel_height?: number | string;
  [key: string]: QueryParams[string];
}

/** Query parameters for {@link SalesClient.listStatuses}. */
export interface ListSaleStatusesParams {
  /** The status source to fetch statuses for. */
  status_source?: string;
  [key: string]: QueryParams[string];
}

/** Query parameters for {@link SalesClient.updateStatus}. */
export interface UpdateSaleStatusParams {
  /** The identifier of the status. */
  status: string;
  /** Optional remark to attach. */
  remark?: string;
  /** `1` marks the sale as processed. */
  mark_processed?: 0 | 1;
  [key: string]: QueryParams[string];
}

/** Query parameters for {@link SalesClient.cancel}. */
export interface CancelSaleParams {
  /** The identifier of a cancellation-type status. */
  status: string;
  /** Optional cancellation remark. */
  remark?: string;
  [key: string]: QueryParams[string];
}

/* -------------------------------------------------------------------------- */
/*                              Sub-clients                                   */
/* -------------------------------------------------------------------------- */

/**
 * Shared base for clients that can update a sale proposal or finalized sale.
 * Proposal and finalized updates are identical across telecom, heat-pump and
 * default sales (same body schema, scope rules and result), so the call is
 * implemented once here.
 */
abstract class SaleMutationsBase extends BaseResource {
  /** PATCH a sale proposal: `{scope}/proposal/{saleId}`. */
  protected patchProposal(
    saleId: string | number,
    input: UpdateSaleInput,
    label: string,
    options?: RequestOptions,
  ): Promise<MutateSaleResult> {
    const body = this.parseInput(UpdateSaleInputSchema, input, label);
    return this.http.request({
      method: "PATCH",
      segments: [this.scope(options), "proposal", saleId],
      dataSchema: MutateSaleResultSchema,
      body,
      options,
    });
  }

  /** PATCH a finalized sale: `account/sales/{saleId}` (always `account` scope). */
  protected patchFinalized(
    saleId: string | number,
    input: UpdateSaleInput,
    label: string,
    options?: RequestOptions,
  ): Promise<MutateSaleResult> {
    const body = this.parseInput(UpdateSaleInputSchema, input, label);
    return this.http.request({
      method: "PATCH",
      segments: ["account", "sales", saleId],
      dataSchema: MutateSaleResultSchema,
      body,
      options,
    });
  }
}

/** Energy sales for the Netherlands (NL flows). */
export class EnergyNlClient extends BaseResource {
  /**
   * Create an energy sale (offer or order) on a NL flow. `flowType` is your
   * flow's type identifier and `flowIdentifier` the flow identifier.
   */
  create(
    flowType: string,
    flowIdentifier: string | number,
    input: EnergyNlSaleInput,
    options?: RequestOptions,
  ): Promise<CreateSaleResult> {
    const body = this.parseInput(EnergyNlSaleInputSchema, input, "sales.energy.nl.create");
    return this.http.request({
      method: "POST",
      segments: ["sales", "flow", flowType, flowIdentifier],
      dataSchema: CreateSaleResultSchema,
      body,
      options,
    });
  }

  /** List energy products with tariff + calculation for the given address/usage. */
  listProducts(
    params: EnergyProductQueryParams,
    options?: RequestOptions,
  ): Promise<EnergyProduct[]> {
    return this.http.request({
      method: "GET",
      segments: ["user", "products", "energy"],
      dataSchema: z.array(EnergyProductSchema),
      query: params as QueryParams,
      options,
    });
  }

  /** Get a single energy product (by id) with tariff + calculation. */
  getProduct(
    productId: string | number,
    params: EnergyProductQueryParams,
    options?: RequestOptions,
  ): Promise<EnergyProduct> {
    return this.http.request({
      method: "GET",
      segments: ["user", "products", productId, "energy"],
      dataSchema: EnergyProductSchema,
      query: params as QueryParams,
      options,
    });
  }

  /** Update an energy product's tariffs. */
  updateProduct(
    productId: string | number,
    input: UpdateEnergyProductInput,
    options?: RequestOptions,
  ): Promise<unknown> {
    const body = this.parseInput(
      UpdateEnergyProductInputSchema,
      input,
      "sales.energy.nl.updateProduct",
    );
    return this.http.request({
      method: "PUT",
      segments: ["account", "products", productId, "energy"],
      dataSchema: z.unknown(),
      body,
      options,
    });
  }
}

/** Energy sales for Belgium (BE flows). */
export class EnergyBeClient extends BaseResource {
  /** Create an energy sale on a BE flow. */
  create(
    flowType: string,
    flowIdentifier: string | number,
    input: EnergyBeSaleInput,
    options?: RequestOptions,
  ): Promise<CreateSaleResult> {
    const body = this.parseInput(EnergyBeSaleInputSchema, input, "sales.energy.be.create");
    return this.http.request({
      method: "POST",
      segments: ["sales", "flow", flowType, flowIdentifier],
      dataSchema: CreateSaleResultSchema,
      body,
      options,
    });
  }

  /** List BE energy products with tariffs + calculations. */
  listProducts(
    params: EnergyBeProductQueryParams,
    options?: RequestOptions,
  ): Promise<EnergyProduct[]> {
    return this.http.request({
      method: "GET",
      segments: ["user", "products", "energy-be"],
      dataSchema: z.array(EnergyProductSchema),
      query: params as QueryParams,
      options,
    });
  }
}

/** Energy sales — exposes the NL and BE sub-clients plus shared energy reads. */
export class EnergyClient extends BaseResource {
  readonly nl: EnergyNlClient;
  readonly be: EnergyBeClient;

  constructor(http: HttpClient, config: ResolvedConfig) {
    super(http, config);
    this.nl = new EnergyNlClient(http, config);
    this.be = new EnergyBeClient(http, config);
  }

  /** List energy sales (offset-paginated export-style rows). Honors the scope. */
  listSales(
    params: ListSalesParams = {},
    options?: RequestOptions,
  ): Promise<OffsetPage<SaleExportRow>> {
    return fetchOffsetPage(
      this.http,
      SaleExportRowSchema,
      [this.scope(options), "sales", "energy"],
      params as QueryParams,
      options,
    );
  }

  /** Estimate yearly energy usage for a household/business. */
  estimateUsage(
    params: EnergyUsageEstimationParams = {},
    options?: RequestOptions,
  ): Promise<EnergyUsageEstimation> {
    return this.http.request({
      method: "GET",
      segments: ["user", "energy", "estimation"],
      dataSchema: EnergyUsageEstimationSchema,
      query: params as QueryParams,
      options,
    });
  }
}

/** Telecom sales. */
export class TelecomClient extends SaleMutationsBase {
  /** Create a telecom sale (offer or order). */
  create(
    flowType: string,
    flowIdentifier: string | number,
    input: TelecomSaleInput,
    options?: RequestOptions,
  ): Promise<CreateSaleResult> {
    const body = this.parseInput(TelecomSaleInputSchema, input, "sales.telecom.create");
    return this.http.request({
      method: "POST",
      segments: ["sales", "flow", flowType, flowIdentifier],
      dataSchema: CreateSaleResultSchema,
      body,
      options,
    });
  }

  /** Update a telecom sale proposal. Honors the configured scope. */
  updateProposal(
    saleId: string | number,
    input: UpdateSaleInput,
    options?: RequestOptions,
  ): Promise<MutateSaleResult> {
    return this.patchProposal(saleId, input, "sales.telecom.updateProposal", options);
  }

  /** Update a finalized telecom sale (always `account` scope). */
  updateFinalized(
    saleId: string | number,
    input: UpdateSaleInput,
    options?: RequestOptions,
  ): Promise<MutateSaleResult> {
    return this.patchFinalized(saleId, input, "sales.telecom.updateFinalized", options);
  }

  /** Compare telecom availability/products for an address (no scope). */
  compare(input: Record<string, unknown>, options?: RequestOptions): Promise<TelecomCompare> {
    return this.http.request({
      method: "POST",
      segments: ["telecom", "compare"],
      dataSchema: TelecomCompareSchema,
      body: input,
      options,
    });
  }
}

/** Hosted-voice sales. */
export class HostedVoiceClient extends BaseResource {
  /** Create a hosted-voice sale. */
  create(
    flowType: string,
    flowIdentifier: string | number,
    input: HostedVoiceSaleInput,
    options?: RequestOptions,
  ): Promise<CreateSaleResult> {
    const body = this.parseInput(HostedVoiceSaleInputSchema, input, "sales.hostedVoice.create");
    return this.http.request({
      method: "POST",
      segments: ["sales", "flow", flowType, flowIdentifier],
      dataSchema: CreateSaleResultSchema,
      body,
      options,
    });
  }
}

/** Solar-panel sales. */
export class SolarClient extends BaseResource {
  /** Create a solar-panel sale (flow type is fixed to `solar-panels`). */
  create(
    flowIdentifier: string | number,
    input: SolarSaleInput,
    options?: RequestOptions,
  ): Promise<CreateSaleResult> {
    const body = this.parseInput(SolarSaleInputSchema, input, "sales.solar.create");
    return this.http.request({
      method: "POST",
      segments: ["sales", "flow", "solar-panels", flowIdentifier],
      dataSchema: CreateSaleResultSchema,
      body,
      options,
    });
  }

  /** Estimate the number of solar panels that fit a roof (no scope). */
  estimatePanels(
    params: PanelsEstimationParams = {},
    options?: RequestOptions,
  ): Promise<PanelsEstimation> {
    return this.http.request({
      method: "GET",
      segments: ["solar", "estimate-panels"],
      dataSchema: PanelsEstimationSchema,
      query: params as QueryParams,
      options,
    });
  }

  /** Compare solar packages for a configuration (no scope). */
  compare(
    input: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<SolarComparePackage[]> {
    return this.http.request({
      method: "POST",
      segments: ["solar", "compare"],
      dataSchema: z.array(SolarComparePackageSchema),
      body: input,
      options,
    });
  }
}

/** Heat-pump sales. */
export class HeatPumpsClient extends SaleMutationsBase {
  /** Create a heat-pump sale (flow type is fixed to `heat-pump`). */
  create(
    flowIdentifier: string | number,
    input: HeatPumpSaleInput,
    options?: RequestOptions,
  ): Promise<CreateSaleResult> {
    const body = this.parseInput(HeatPumpSaleInputSchema, input, "sales.heatPumps.create");
    return this.http.request({
      method: "POST",
      segments: ["sales", "flow", "heat-pump", flowIdentifier],
      dataSchema: CreateSaleResultSchema,
      body,
      options,
    });
  }

  /** Update a heat-pump sale proposal. Honors the configured scope. */
  updateProposal(
    saleId: string | number,
    input: UpdateSaleInput,
    options?: RequestOptions,
  ): Promise<MutateSaleResult> {
    return this.patchProposal(saleId, input, "sales.heatPumps.updateProposal", options);
  }

  /** Update a finalized heat-pump sale (always `account` scope). */
  updateFinalized(
    saleId: string | number,
    input: UpdateSaleInput,
    options?: RequestOptions,
  ): Promise<MutateSaleResult> {
    return this.patchFinalized(saleId, input, "sales.heatPumps.updateFinalized", options);
  }
}

/* -------------------------------------------------------------------------- */
/*                              Sales client                                  */
/* -------------------------------------------------------------------------- */

/**
 * Sales API — the primary Salesdock module. Create and retrieve sales across
 * every product type, manage statuses and extra fields, and read the sale
 * catalog (flows, product questions, agreements).
 */
export class SalesClient extends SaleMutationsBase {
  readonly energy: EnergyClient;
  readonly telecom: TelecomClient;
  readonly hostedVoice: HostedVoiceClient;
  readonly solar: SolarClient;
  readonly heatPumps: HeatPumpsClient;

  constructor(http: HttpClient, config: ResolvedConfig) {
    super(http, config);
    this.energy = new EnergyClient(http, config);
    this.telecom = new TelecomClient(http, config);
    this.hostedVoice = new HostedVoiceClient(http, config);
    this.solar = new SolarClient(http, config);
    this.heatPumps = new HeatPumpsClient(http, config);
  }

  /* ----------------------------- Sales listing ---------------------------- */

  /** List sales (offset-paginated). Honors the configured scope. */
  list(params: ListSalesParams = {}, options?: RequestOptions): Promise<OffsetPage<SaleListItem>> {
    return fetchOffsetPage(
      this.http,
      SaleListItemSchema,
      [this.scope(options), "sales"],
      params as QueryParams,
      options,
    );
  }

  /** Retrieve a single sale by id. Honors the configured scope. */
  get(saleId: string | number, options?: RequestOptions): Promise<Sale> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "sales", saleId],
      dataSchema: SaleSchema,
      options,
    });
  }

  /** Retrieve a sale's signed contract (base64 PDF in `contract.content`). */
  getContract(saleId: string | number, options?: RequestOptions): Promise<SaleContract> {
    return this.http.request({
      method: "GET",
      segments: ["account", "sales", "contract", saleId],
      dataSchema: SaleContractSchema,
      options,
    });
  }

  /** Retrieve the answers (question identifier -> value) given for a sale. */
  getAnswers(saleId: string | number, options?: RequestOptions): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "sales", "answers", saleId],
      dataSchema: z.record(z.string(), z.unknown()),
      options,
    });
  }

  /** List sales rendered through an export template (offset-paginated rows). */
  listByExportTemplate(
    exportTemplate: string,
    params: ListSalesParams = {},
    options?: RequestOptions,
  ): Promise<OffsetPage<SaleExportRow>> {
    return fetchOffsetPage(
      this.http,
      SaleExportRowSchema,
      ["account", "sales", "export", exportTemplate],
      params as QueryParams,
      options,
    );
  }

  /* ------------------------------ Sale catalog ---------------------------- */

  /** List flows. Honors the configured scope. */
  listFlows(options?: RequestOptions): Promise<FlowListItem[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "flows"],
      dataSchema: z.array(FlowListItemSchema),
      options,
    });
  }

  /** Get a single flow by id. */
  getFlow(flowId: string | number, options?: RequestOptions): Promise<Flow> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "flows", flowId],
      dataSchema: FlowSchema,
      options,
    });
  }

  /** List product questions. */
  listProductQuestions(options?: RequestOptions): Promise<ProductQuestionListItem[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "productquestions"],
      dataSchema: z.array(ProductQuestionListItemSchema),
      options,
    });
  }

  /** Get a single product question by id. */
  getProductQuestion(
    productQuestionId: string | number,
    options?: RequestOptions,
  ): Promise<ProductQuestion> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "productquestions", productQuestionId],
      dataSchema: ProductQuestionSchema,
      options,
    });
  }

  /** List agreements. */
  listAgreements(options?: RequestOptions): Promise<AgreementListItem[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "agreements"],
      dataSchema: z.array(AgreementListItemSchema),
      options,
    });
  }

  /** Get a single agreement by id. */
  getAgreement(agreementId: string | number, options?: RequestOptions): Promise<Agreement> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "agreements", agreementId],
      dataSchema: AgreementSchema,
      options,
    });
  }

  /* ----------------------------- Create sales ----------------------------- */

  /**
   * Low-level create-sale call: POST to `sales/flow/{flowType}/{flowIdentifier}`
   * with an arbitrary body. Prefer the typed helpers (`createDefault`,
   * `sales.energy.nl.create`, `sales.telecom.create`, ...) where they exist.
   */
  createSale(
    flowType: string,
    flowIdentifier: string | number,
    body: Record<string, unknown>,
    options?: RequestOptions,
  ): Promise<CreateSaleResult> {
    return this.http.request({
      method: "POST",
      segments: ["sales", "flow", flowType, flowIdentifier],
      dataSchema: CreateSaleResultSchema,
      body,
      options,
    });
  }

  /** Create a default (generic) sale. */
  createDefault(
    flowType: string,
    flowIdentifier: string | number,
    input: DefaultSaleInput,
    options?: RequestOptions,
  ): Promise<CreateSaleResult> {
    const body = this.parseInput(DefaultSaleInputSchema, input, "sales.createDefault");
    return this.http.request({
      method: "POST",
      segments: ["sales", "flow", flowType, flowIdentifier],
      dataSchema: CreateSaleResultSchema,
      body,
      options,
    });
  }

  /** Create a default sale with multiple related products. */
  createDefaultMultiple(
    flowType: string,
    flowIdentifier: string | number,
    input: MultiProductSaleInput,
    options?: RequestOptions,
  ): Promise<CreateSaleResult> {
    const body = this.parseInput(MultiProductSaleInputSchema, input, "sales.createDefaultMultiple");
    return this.http.request({
      method: "POST",
      segments: ["sales", "flow", flowType, flowIdentifier],
      dataSchema: CreateSaleResultSchema,
      body,
      options,
    });
  }

  /** Update a default sale proposal. Honors the configured scope. */
  updateDefaultProposal(
    saleId: string | number,
    input: UpdateSaleInput,
    options?: RequestOptions,
  ): Promise<MutateSaleResult> {
    return this.patchProposal(saleId, input, "sales.updateDefaultProposal", options);
  }

  /** Update a finalized default sale (always `account` scope). */
  updateDefaultFinalized(
    saleId: string | number,
    input: UpdateSaleInput,
    options?: RequestOptions,
  ): Promise<MutateSaleResult> {
    return this.patchFinalized(saleId, input, "sales.updateDefaultFinalized", options);
  }

  /* ------------------------- Statuses & extra fields ---------------------- */

  /** List the available sale statuses. Honors the configured scope. */
  listStatuses(
    params: ListSaleStatusesParams = {},
    options?: RequestOptions,
  ): Promise<SaleStatus[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "statuses"],
      dataSchema: z.array(SaleStatusSchema),
      query: params as QueryParams,
      options,
    });
  }

  /** Update a sale's status (always `account` scope). */
  updateStatus(
    saleId: string | number,
    params: UpdateSaleStatusParams,
    options?: RequestOptions,
  ): Promise<unknown> {
    return this.http.request({
      method: "POST",
      segments: ["account", "sales", "updatestatus", saleId],
      dataSchema: z.unknown(),
      query: params as QueryParams,
      options,
    });
  }

  /** Update a sale's status by the incoming id (always `account` scope). */
  updateStatusByIncoming(
    incomingId: string | number,
    params: UpdateSaleStatusParams,
    options?: RequestOptions,
  ): Promise<unknown> {
    return this.http.request({
      method: "POST",
      segments: ["account", "sales", "updatestatus", "incoming", incomingId],
      dataSchema: z.unknown(),
      query: params as QueryParams,
      options,
    });
  }

  /** Update a sale's extra field values (always `account` scope). */
  updateFields(
    saleId: string | number,
    fields: UpdateSaleFieldsInput,
    options?: RequestOptions,
  ): Promise<unknown> {
    const body = this.parseInput(UpdateSaleFieldsInputSchema, fields, "sales.updateFields");
    return this.http.request({
      method: "POST",
      segments: ["account", "sales", "updatefields", saleId],
      dataSchema: z.unknown(),
      body,
      options,
    });
  }

  /** Update a sale's extra field values by incoming id (always `account` scope). */
  updateFieldsByIncoming(
    incomingId: string | number,
    fields: UpdateSaleFieldsInput,
    options?: RequestOptions,
  ): Promise<unknown> {
    const body = this.parseInput(
      UpdateSaleFieldsInputSchema,
      fields,
      "sales.updateFieldsByIncoming",
    );
    return this.http.request({
      method: "POST",
      segments: ["account", "sales", "updatefields", "incoming", incomingId],
      dataSchema: z.unknown(),
      body,
      options,
    });
  }

  /** Cancel a sale (always `user` scope). */
  cancel(
    saleId: string | number,
    params: CancelSaleParams,
    options?: RequestOptions,
  ): Promise<unknown> {
    return this.http.request({
      method: "POST",
      segments: ["user", "sales", "cancel", saleId],
      dataSchema: z.unknown(),
      query: params as QueryParams,
      options,
    });
  }

  /* ------------------------------ Sale reads ------------------------------ */

  /** Get the sale linked to a lead. Honors the configured scope. */
  getOfLead(leadId: string | number, options?: RequestOptions): Promise<SaleOfLead> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "leads", leadId, "sale"],
      dataSchema: SaleOfLeadSchema,
      options,
    });
  }

  /** Get a sale's products + totals breakdown. Honors the configured scope. */
  getProducts(saleId: string | number, options?: RequestOptions): Promise<SaleProducts> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "sales", saleId, "products"],
      dataSchema: SaleProductsSchema,
      options,
    });
  }

  /** Get the sale ids attached to a form instance. Honors the configured scope. */
  getOfFormInstance(
    formInstanceId: string | number,
    options?: RequestOptions,
  ): Promise<Array<number | string>> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "sales", "form_instance", formInstanceId],
      dataSchema: z.array(idSchema),
      options,
    });
  }

  /** List a sale's documents (each with a download `location`). */
  getDocuments(saleId: string | number, options?: RequestOptions): Promise<SaleDocument[]> {
    return this.http.request({
      method: "GET",
      segments: ["account", "sales", saleId, "documents"],
      dataSchema: z.array(SaleDocumentSchema),
      options,
    });
  }

  /** Get a sale's change history (always `account` scope). */
  getHistory(saleId: string | number, options?: RequestOptions): Promise<SaleHistoryEntry[]> {
    return this.http.request({
      method: "GET",
      segments: ["account", "sales", saleId, "history"],
      dataSchema: z.array(SaleHistoryEntrySchema),
      options,
    });
  }

  /** Create an opt-in for a sale (always `account` scope). */
  createOptin(
    saleId: string | number,
    input: CreateOptinInput = {},
    options?: RequestOptions,
  ): Promise<unknown> {
    const body = this.parseInput(CreateOptinInputSchema, input, "sales.createOptin");
    return this.http.request({
      method: "POST",
      segments: ["account", "sales", saleId, "optin"],
      dataSchema: z.unknown(),
      body,
      options,
    });
  }
}
