import { z } from "zod";
import { BaseResource } from "./base.js";
import { addressSchema, extraFieldSchema, idSchema, loose, nullish } from "../schemas/common.js";
import { fetchOffsetPage, type OffsetPage } from "../core/pagination.js";
import type { QueryParams, RequestOptions } from "../core/types.js";

/** A relation as returned in list responses. */
export const RelationListItemSchema = loose({
  id: idSchema,
  business: nullish(z.union([z.boolean(), z.string(), z.number()])),
  shared_with: nullish(z.string()),
  organisation_id: nullish(idSchema),
  gender: nullish(z.string()),
  firstname: nullish(z.string()),
  lastname: nullish(z.string()),
  birthdate: nullish(z.string()),
  postcode: nullish(z.string()),
  housenumber: nullish(z.union([z.string(), z.number()])),
  suffix: nullish(z.string()),
  streetname: nullish(z.string()),
  city: nullish(z.string()),
  email: nullish(z.string()),
  phone: nullish(z.string()),
  company_name: nullish(z.string()),
  contact_person: nullish(z.string()),
  coc: nullish(z.string()),
  vat: nullish(z.string()),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
});
export type RelationListItem = z.infer<typeof RelationListItemSchema>;

/** A single relation with its nested customer block and extra fields. */
export const RelationSchema = loose({
  id: idSchema,
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
  customer: loose({
    gender: nullish(z.string()),
    firstname: nullish(z.string()),
    lastname: nullish(z.string()),
    birthdate: nullish(z.string()),
    email: nullish(z.string()),
    phone: nullish(z.string()),
    business: nullish(z.union([z.boolean(), z.string(), z.number()])),
    company_name: nullish(z.string()),
    contact_person: nullish(z.string()),
    coc: nullish(z.string()),
    vat: nullish(z.string()),
    address: addressSchema.optional(),
  }).optional(),
  shared_with: nullish(z.string()),
  organisation_id: nullish(idSchema),
  extrafields: z.array(extraFieldSchema).optional(),
});
export type Relation = z.infer<typeof RelationSchema>;

export const MutateRelationResultSchema = loose({ relation_id: idSchema });
export type MutateRelationResult = z.infer<typeof MutateRelationResultSchema>;

/** Query parameters for {@link RelationsClient.list}. */
export interface ListRelationsParams {
  /** Free-text search over name, company_name, email and postcode. */
  q?: string;
  /** Date field to filter on: `created_date`, `updated_date`, `deleted_date`. */
  period_filter_on?: "created_date" | "updated_date" | "deleted_date";
  /** Period preset: `custom`, `today`, `yesterday`, `this_week`, ... */
  period?: string;
  /** Start date when `period` is `custom`. */
  period_start?: string;
  /** End date when `period` is `custom`. */
  period_end?: string;
  /** `1` = business relations, `0` = consumer relations. */
  business?: 0 | 1;
  /** Page number (offset pagination). */
  page?: number;
}

/** Body for creating/updating a relation. */
export const RelationInputSchema = z
  .object({
    visibility: z.string().optional(),
    organisation_id: idSchema.optional(),
    user_id: idSchema.optional(),
    gender: z.string().optional(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    postcode: z.string().optional(),
    housenumber: z.union([z.string(), z.number()]).optional(),
    suffix: z.string().optional(),
    streetname: z.string().optional(),
    city: z.string().optional(),
    birthdate: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    business: z.union([z.string(), z.number(), z.boolean()]).optional(),
    company_name: z.string().optional(),
    contact_person: z.string().optional(),
    company_coc: z.string().optional(),
    company_vat: z.string().optional(),
  })
  .passthrough();
export type RelationInput = z.input<typeof RelationInputSchema>;

/**
 * Relations API — manage customer/relation records.
 */
export class RelationsClient extends BaseResource {
  /** List relations (offset-paginated). Honors the configured scope. */
  list(
    params: ListRelationsParams = {},
    options?: RequestOptions,
  ): Promise<OffsetPage<RelationListItem>> {
    return fetchOffsetPage(
      this.http,
      RelationListItemSchema,
      [this.scope(options), "relations"],
      params as QueryParams,
      options,
    );
  }

  /** Retrieve a single relation by id (always `account` scope). */
  get(relationId: number | string, options?: RequestOptions): Promise<Relation> {
    return this.http.request({
      method: "GET",
      segments: ["account", "relations", relationId],
      dataSchema: RelationSchema,
      options,
    });
  }

  /** Create a relation. Honors the configured scope. */
  create(input: RelationInput, options?: RequestOptions): Promise<MutateRelationResult> {
    const body = this.parseInput(RelationInputSchema, input, "relations.create");
    return this.http.request({
      method: "POST",
      segments: [this.scope(options), "relations"],
      dataSchema: MutateRelationResultSchema,
      body,
      options,
    });
  }

  /** Update a relation by id (always `account` scope). */
  update(
    relationId: number | string,
    input: RelationInput,
    options?: RequestOptions,
  ): Promise<MutateRelationResult> {
    const body = this.parseInput(RelationInputSchema, input, "relations.update");
    return this.http.request({
      method: "PUT",
      segments: ["account", "relations", relationId],
      dataSchema: MutateRelationResultSchema,
      body,
      options,
    });
  }
}
