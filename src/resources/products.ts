import { z } from "zod";
import { BaseResource } from "./base.js";
import { boolishSchema, extraFieldSchema, idSchema, loose, nullish } from "../schemas/common.js";
import type { QueryParams, RequestOptions } from "../core/types.js";
import type { HttpClient } from "../core/http.js";
import type { ResolvedConfig } from "../core/config.js";

/** A supplier as returned in the suppliers list response. */
export const SupplierListItemSchema = loose({
  id: idSchema,
  name: nullish(z.string()),
  text: nullish(z.string()),
  identifier: nullish(z.string()),
  description: nullish(z.string()),
  active: nullish(boolishSchema),
});
export type SupplierListItem = z.infer<typeof SupplierListItemSchema>;

/** An image/logo blob (base64 content + extension) embedded in responses. */
export const MediaBlobSchema = loose({
  extension: nullish(z.string()),
  content: nullish(z.string()),
});
export type MediaBlob = z.infer<typeof MediaBlobSchema>;

/** A single supplier with its full detail block. */
export const SupplierSchema = loose({
  id: idSchema,
  name: nullish(z.string()),
  text: nullish(z.string()),
  identifier: nullish(z.string()),
  description: nullish(z.string()),
  confirmation_pdf_layout: nullish(z.string()),
  contractor: nullish(z.string()),
  company_name: nullish(z.string()),
  contact_person: nullish(z.string()),
  postcode: nullish(z.string()),
  housenumber: nullish(z.union([z.string(), z.number()])),
  suffix: nullish(z.string()),
  streetname: nullish(z.string()),
  city: nullish(z.string()),
  email: nullish(z.string()),
  phone: nullish(z.string()),
  coc: nullish(z.string()),
  vat: nullish(z.string()),
  website: nullish(z.string()),
  logo: nullish(MediaBlobSchema),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
  email_template: nullish(z.string()),
  extrafields: z.array(extraFieldSchema).optional(),
});
export type Supplier = z.infer<typeof SupplierSchema>;

/** Result of a supplier create/update/delete (just the affected id). */
export const MutateSupplierResultSchema = loose({ supplier_id: idSchema });
export type MutateSupplierResult = z.infer<typeof MutateSupplierResultSchema>;

/** Body for creating/updating a supplier. */
export const SupplierInputSchema = z
  .object({
    /** Name of the supplier. */
    name: z.string().optional(),
    /** Unique identifier (slug) for the supplier. */
    identifier: z.string().optional(),
    /** `0` = inactive, `1` = active. */
    active: z.union([z.string(), z.number(), z.boolean()]).optional(),
    description: z.string().optional(),
    /** `"yes"` = is a contractor, `"no"` = not a contractor. */
    contractor: z.string().optional(),
    company_name: z.string().optional(),
    contact_person: z.string().optional(),
    postcode: z.string().optional(),
    housenumber: z.union([z.string(), z.number()]).optional(),
    suffix: z.string().optional(),
    streetname: z.string().optional(),
    city: z.string().optional(),
    coc: z.string().optional(),
    vat: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
    /** Logo as `{ content: base64, extension: "png"|"gif"|"jpg"|"jpeg" }`. */
    logo: z
      .object({ content: z.string().optional(), extension: z.string().optional() })
      .passthrough()
      .optional(),
  })
  .passthrough();
export type SupplierInput = z.input<typeof SupplierInputSchema>;

/**
 * Suppliers sub-client — manage product suppliers. `list`/`get` honor the
 * configured scope; mutations are always `account`-scoped (admin only).
 */
export class SuppliersClient extends BaseResource {
  /** List suppliers with their basic details. Honors the configured scope. */
  list(options?: RequestOptions): Promise<SupplierListItem[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "suppliers"],
      dataSchema: z.array(SupplierListItemSchema),
      options,
    });
  }

  /** Retrieve a single supplier by id. Honors the configured scope. */
  get(supplierId: number | string, options?: RequestOptions): Promise<Supplier> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "suppliers", supplierId],
      dataSchema: SupplierSchema,
      options,
    });
  }

  /** Create a supplier (always `account` scope, admin only). */
  create(input: SupplierInput, options?: RequestOptions): Promise<MutateSupplierResult> {
    const body = this.parseInput(SupplierInputSchema, input, "products.suppliers.create");
    return this.http.request({
      method: "POST",
      segments: ["account", "suppliers"],
      dataSchema: MutateSupplierResultSchema,
      body,
      options,
    });
  }

  /** Update a supplier by id (always `account` scope, admin only). */
  update(
    supplierId: number | string,
    input: SupplierInput,
    options?: RequestOptions,
  ): Promise<MutateSupplierResult> {
    const body = this.parseInput(SupplierInputSchema, input, "products.suppliers.update");
    return this.http.request({
      method: "PUT",
      segments: ["account", "suppliers", supplierId],
      dataSchema: MutateSupplierResultSchema,
      body,
      options,
    });
  }

  /** Delete a supplier by id (always `account` scope, admin only). */
  delete(supplierId: number | string, options?: RequestOptions): Promise<MutateSupplierResult> {
    return this.http.request({
      method: "DELETE",
      segments: ["account", "suppliers", supplierId],
      dataSchema: MutateSupplierResultSchema,
      options,
    });
  }
}

/** A product as returned in the products list response. */
export const ProductListItemSchema = loose({
  id: idSchema,
  name: nullish(z.string()),
  identifier: nullish(z.string()),
  supplier_id: nullish(idSchema),
  supplier_name: nullish(z.string()),
  supplier_identifier: nullish(z.string()),
  type: nullish(z.string()),
  usp: nullish(z.string()),
  description: nullish(z.string()),
  cart_info: nullish(z.string()),
  business: nullish(z.union([z.string(), z.number()])),
  active: nullish(boolishSchema),
  valid_from: nullish(z.string()),
  valid_till: nullish(z.string()),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
});
export type ProductListItem = z.infer<typeof ProductListItemSchema>;

/** A document attached to a product. */
export const ProductDocumentSchema = loose({
  name: nullish(z.string()),
  location: nullish(z.string()),
});
export type ProductDocument = z.infer<typeof ProductDocumentSchema>;

/** A single product with its full detail block. */
export const ProductSchema = loose({
  id: idSchema,
  name: nullish(z.string()),
  identifier: nullish(z.string()),
  main: nullish(z.union([z.number(), z.string(), z.boolean()])),
  type: nullish(z.string()),
  image: nullish(MediaBlobSchema),
  usp: nullish(z.string()),
  description: nullish(z.string()),
  duration: nullish(z.union([z.string(), z.number()])),
  business: nullish(z.union([z.string(), z.number()])),
  retention: nullish(z.union([z.string(), z.number()])),
  confirmation_pdf_layout: nullish(z.string()),
  active: nullish(boolishSchema),
  price: nullish(z.union([z.string(), z.number()])),
  price_action: nullish(z.union([z.string(), z.number()])),
  price_action_type: nullish(z.string()),
  price_action_value: nullish(z.union([z.string(), z.number()])),
  price_monthly: nullish(z.union([z.string(), z.number()])),
  price_monthly_action: nullish(z.union([z.string(), z.number()])),
  price_monthly_action_type: nullish(z.string()),
  price_monthly_action_value: nullish(z.union([z.string(), z.number()])),
  valid_from: nullish(z.string()),
  valid_till: nullish(z.string()),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
  supplier_id: nullish(idSchema),
  supplier_name: nullish(z.string()),
  supplier_identifier: nullish(z.string()),
  customfields: z.record(z.string(), z.unknown()).optional(),
  documents: z.array(ProductDocumentSchema).optional(),
});
export type Product = z.infer<typeof ProductSchema>;

/** Result of a product create/update/delete (just the affected id). */
export const MutateProductResultSchema = loose({ product_id: idSchema });
export type MutateProductResult = z.infer<typeof MutateProductResultSchema>;

/** Result of connecting an organisation to products. */
export const ConnectOrganisationResultSchema = loose({
  organisation_id: idSchema,
  products: z.array(idSchema),
});
export type ConnectOrganisationResult = z.infer<typeof ConnectOrganisationResultSchema>;

/** Result of connecting a product to organisations. */
export const ConnectProductResultSchema = loose({
  product_id: idSchema,
  organisations: z.array(idSchema),
});
export type ConnectProductResult = z.infer<typeof ConnectProductResultSchema>;

/** Query parameters for {@link ProductsClient.list}. */
export interface ListProductsParams {
  /** Free-text search over products. */
  q?: string;
  /** Filter by product type identifier (single). */
  type?: string;
  /** Filter by multiple product type identifiers (`types[]=`). */
  types?: string[];
  /** `1` = business product, `0` = consumer product. */
  business?: 0 | 1;
  /** Filter by the supplier's id. */
  supplier_id?: number | string;
  /**
   * `1` = active, `0` = inactive (only available in `account` scope). By
   * default only active products are returned.
   */
  active?: 0 | 1;
  /** Date field to filter on: `created_date` or `updated_date`. */
  period_filter_on?: "created_date" | "updated_date";
  /**
   * Period preset: `today`, `yesterday`, `this_week`, `last_week`,
   * `last_30_days`, `this_month`, `last_month`, `custom`.
   */
  period?: string;
  /** Start date (`yyyy-mm-dd`) when `period` is `custom`. */
  period_start?: string;
  /** End date (`yyyy-mm-dd`) when `period` is `custom`. */
  period_end?: string;
}

/** Body for creating a product. */
export const CreateProductInputSchema = z
  .object({
    /** Name of the product (required). */
    name: z.string(),
    /** Unique slug identifier for the product (required). */
    identifier: z.string(),
    /** Product type identifier (required). */
    type: z.string(),
    /** The supplier's id (required for main products). */
    supplier_id: idSchema.optional(),
    /** USP shown in the agent portal during a sale. */
    usp: z.string().optional(),
    description: z.string().optional(),
    /** Contract duration in months. */
    duration: z.union([z.string(), z.number()]).optional(),
    /** `1` = business, `0` = consumer, `2` = both (main products only). */
    business: z.union([z.string(), z.number()]).optional(),
    /** `0` = new customers, `1` = existing, `2` = both (required for main products). */
    retention: z.union([z.string(), z.number()]).optional(),
    /** `1` = active, `0` = inactive (required). */
    active: z.union([z.string(), z.number(), z.boolean()]),
    /** One-time price. */
    price: z.union([z.string(), z.number()]).optional(),
    /** One-time promotion price. */
    price_action: z.union([z.string(), z.number()]).optional(),
    /** Monthly price. */
    price_monthly: z.union([z.string(), z.number()]).optional(),
    /** Monthly promotion price. */
    price_monthly_action: z.union([z.string(), z.number()]).optional(),
    /** Number of months the promotion price applies. */
    price_monthly_action_value: z.union([z.string(), z.number()]).optional(),
    /** Start date from which the product can be sold. */
    valid_from: z.string().optional(),
    /** End date until which the product can be sold. */
    valid_till: z.string().optional(),
    /** Image as `{ content: base64, extension: "png"|"gif"|"jpg"|"jpeg" }`. */
    image: z
      .object({ content: z.string().optional(), extension: z.string().optional() })
      .passthrough()
      .optional(),
    /** Product documents to attach, as an array. */
    attachments: z.array(z.unknown()).optional(),
  })
  .passthrough();
export type CreateProductInput = z.input<typeof CreateProductInputSchema>;

/** Body for updating a product (all fields optional). */
export const UpdateProductInputSchema = z
  .object({
    name: z.string().optional(),
    identifier: z.string().optional(),
    type: z.string().optional(),
    supplier_id: idSchema.optional(),
    usp: z.string().optional(),
    description: z.string().optional(),
    duration: z.union([z.string(), z.number()]).optional(),
    business: z.union([z.string(), z.number()]).optional(),
    retention: z.union([z.string(), z.number()]).optional(),
    active: z.union([z.string(), z.number(), z.boolean()]).optional(),
    price: z.union([z.string(), z.number()]).optional(),
    price_action: z.union([z.string(), z.number()]).optional(),
    price_monthly: z.union([z.string(), z.number()]).optional(),
    price_monthly_action: z.union([z.string(), z.number()]).optional(),
    price_monthly_action_value: z.union([z.string(), z.number()]).optional(),
    valid_from: z.string().optional(),
    valid_till: z.string().optional(),
    image: z
      .object({ content: z.string().optional(), extension: z.string().optional() })
      .passthrough()
      .optional(),
    attachments: z.array(z.unknown()).optional(),
  })
  .passthrough();
export type UpdateProductInput = z.input<typeof UpdateProductInputSchema>;

/** Body for {@link ProductsClient.connectOrganisationToProducts}. */
export const ConnectOrganisationToProductsInputSchema = z
  .object({
    /**
     * Product ids to connect. Omit to connect all available products; send an
     * empty array to disconnect all.
     */
    products: z.array(idSchema).optional(),
  })
  .passthrough();
export type ConnectOrganisationToProductsInput = z.input<
  typeof ConnectOrganisationToProductsInputSchema
>;

/** Body for {@link ProductsClient.connectProductToOrganisations}. */
export const ConnectProductToOrganisationsInputSchema = z
  .object({
    /**
     * Organisation ids to connect. Omit to connect all available organisations;
     * send an empty array to disconnect all.
     */
    organisations: z.array(idSchema).optional(),
  })
  .passthrough();
export type ConnectProductToOrganisationsInput = z.input<
  typeof ConnectProductToOrganisationsInputSchema
>;

/**
 * Products API — manage the product catalog and its suppliers. `list`/`get`
 * honor the configured scope; mutations are always `account`-scoped (admin
 * only). Supplier endpoints are exposed via {@link ProductsClient.suppliers}.
 */
export class ProductsClient extends BaseResource {
  /** Suppliers sub-client. */
  readonly suppliers: SuppliersClient;

  constructor(http: HttpClient, config: ResolvedConfig) {
    super(http, config);
    this.suppliers = new SuppliersClient(http, config);
  }

  /** List products with their basic details. Honors the configured scope. */
  list(params: ListProductsParams = {}, options?: RequestOptions): Promise<ProductListItem[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "products"],
      dataSchema: z.array(ProductListItemSchema),
      query: params as QueryParams,
      options,
    });
  }

  /** Retrieve a single product by id. Honors the configured scope. */
  get(productId: number | string, options?: RequestOptions): Promise<Product> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "products", productId],
      dataSchema: ProductSchema,
      options,
    });
  }

  /** Create a product (always `account` scope, admin only). */
  create(input: CreateProductInput, options?: RequestOptions): Promise<MutateProductResult> {
    const body = this.parseInput(CreateProductInputSchema, input, "products.create");
    return this.http.request({
      method: "POST",
      segments: ["account", "products"],
      dataSchema: MutateProductResultSchema,
      body,
      options,
    });
  }

  /** Update a product by id (always `account` scope, admin only). */
  update(
    productId: number | string,
    input: UpdateProductInput,
    options?: RequestOptions,
  ): Promise<MutateProductResult> {
    const body = this.parseInput(UpdateProductInputSchema, input, "products.update");
    return this.http.request({
      method: "PUT",
      segments: ["account", "products", productId],
      dataSchema: MutateProductResultSchema,
      body,
      options,
    });
  }

  /** Delete a product by id (always `account` scope, admin only). */
  delete(productId: number | string, options?: RequestOptions): Promise<MutateProductResult> {
    return this.http.request({
      method: "DELETE",
      segments: ["account", "products", productId],
      dataSchema: MutateProductResultSchema,
      options,
    });
  }

  /**
   * Connect a set of products to an organisation so its users can sell them.
   * Always `account` scope (admin only). Omit `products` to connect all; pass
   * an empty array to disconnect all. Returns the connected product ids.
   */
  connectOrganisationToProducts(
    organisationId: number | string,
    input: ConnectOrganisationToProductsInput = {},
    options?: RequestOptions,
  ): Promise<ConnectOrganisationResult> {
    const body = this.parseInput(
      ConnectOrganisationToProductsInputSchema,
      input,
      "products.connectOrganisationToProducts",
    );
    return this.http.request({
      method: "POST",
      segments: ["account", "connect-organisation-to-products", organisationId],
      dataSchema: ConnectOrganisationResultSchema,
      body,
      options,
    });
  }

  /**
   * Connect a set of organisations to a product so their users can sell it.
   * Always `account` scope (admin only). Omit `organisations` to connect all;
   * pass an empty array to disconnect all. Returns the connected organisation ids.
   */
  connectProductToOrganisations(
    productId: number | string,
    input: ConnectProductToOrganisationsInput = {},
    options?: RequestOptions,
  ): Promise<ConnectProductResult> {
    const body = this.parseInput(
      ConnectProductToOrganisationsInputSchema,
      input,
      "products.connectProductToOrganisations",
    );
    return this.http.request({
      method: "POST",
      segments: ["account", "connect-product-to-organisations", productId],
      dataSchema: ConnectProductResultSchema,
      body,
      options,
    });
  }
}
