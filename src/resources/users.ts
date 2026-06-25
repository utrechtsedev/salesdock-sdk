import { z } from "zod";
import { BaseResource } from "./base.js";
import { addressSchema, boolishSchema, idSchema, loose, nullish } from "../schemas/common.js";
import { fetchOffsetPage, type OffsetPage } from "../core/pagination.js";
import type { HttpClient } from "../core/http.js";
import type { ResolvedConfig } from "../core/config.js";
import type { QueryParams, RequestOptions } from "../core/types.js";

/** Extra fields keyed by label/identifier; values are strings or string arrays. */
const extraFieldsMapSchema = z.record(z.string(), z.unknown());

/** A user as returned in the (paginated) users list. */
export const UserSchema = loose({
  id: idSchema,
  firstname: nullish(z.string()),
  lastname: nullish(z.string()),
  email: nullish(z.string()),
  role: nullish(z.string()),
  active: nullish(boolishSchema),
  /** Basic response: organisation name string. Extended response: an object. */
  organisation: nullish(
    z.union([
      z.string(),
      loose({
        id: nullish(idSchema),
        label: nullish(z.string()),
        identifier: nullish(z.string()),
      }),
    ]),
  ),
  organisation_id: nullish(idSchema),
  organisation_identifier: nullish(z.string()),
  team: nullish(
    loose({
      id: nullish(idSchema),
      label: nullish(z.string()),
      identifier: nullish(z.string()),
    }),
  ),
  extrafields: nullish(extraFieldsMapSchema),
  business: nullish(
    loose({
      name: nullish(z.string()),
      email: nullish(z.string()),
      phone_number: nullish(z.string()),
      contact_person: nullish(z.string()),
      postcode: nullish(z.string()),
      housenumber: nullish(z.union([z.string(), z.number()])),
      housenumber_suffix: nullish(z.string()),
      suffix: nullish(z.string()),
      streetname: nullish(z.string()),
      city: nullish(z.string()),
      coc: nullish(z.string()),
      vat: nullish(z.string()),
      address: addressSchema.optional(),
    }),
  ),
});
export type User = z.infer<typeof UserSchema>;

/** An organisation as returned in the (paginated) organisations list. */
export const OrganisationListItemSchema = loose({
  id: idSchema,
  name: nullish(z.string()),
  identifier: nullish(z.string()),
  company_name: nullish(z.string()),
  contact_person: nullish(z.string()),
  email: nullish(z.string()),
  phone: nullish(z.string()),
  extrafields: nullish(extraFieldsMapSchema),
});
export type OrganisationListItem = z.infer<typeof OrganisationListItemSchema>;

/** An organisation logo (base64 content + file extension). */
export const OrganisationLogoSchema = loose({
  extension: nullish(z.string()),
  content: nullish(z.string()),
});
export type OrganisationLogo = z.infer<typeof OrganisationLogoSchema>;

/** A single organisation with its full detail set. */
export const OrganisationSchema = loose({
  id: idSchema,
  name: nullish(z.string()),
  text: nullish(z.string()),
  identifier: nullish(z.string()),
  description: nullish(z.string()),
  partner: nullish(z.string()),
  sales_channel: nullish(z.string()),
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
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
  logo: nullish(OrganisationLogoSchema),
  extrafields: nullish(extraFieldsMapSchema),
});
export type Organisation = z.infer<typeof OrganisationSchema>;

/** Result of creating/updating/deleting an organisation. */
export const MutateOrganisationResultSchema = loose({ organisation_id: idSchema });
export type MutateOrganisationResult = z.infer<typeof MutateOrganisationResultSchema>;

/** Result of {@link OrganisationsClient.listProducts}: connected product ids. */
export const OrganisationProductsSchema = loose({ products: z.array(idSchema) });
export type OrganisationProducts = z.infer<typeof OrganisationProductsSchema>;

/** An organisation logo to attach on create/update. */
export const OrganisationLogoInputSchema = z
  .object({
    /** Base64 string of the organisation logo. */
    content: z.string(),
    /** Image extension: `png`, `gif`, `jpg` or `jpeg`. */
    extension: z.string(),
  })
  .passthrough();

/** Body for creating/updating an organisation. */
export const OrganisationInputSchema = z
  .object({
    /** The name of the organisation. */
    name: z.string().optional(),
    /** Unique identifier slug for the organisation. */
    identifier: z.string().optional(),
    description: z.string().optional(),
    /** Sales channel: `d2d`, `retail`, `telemarketing`, `online` or `f2f`. */
    sales_channel: z.string().optional(),
    /** `yes` if the organisation is a contractor, otherwise `no`. */
    contractor: z.string().optional(),
    /** Required if `contractor` = `yes`. */
    company_name: z.string().optional(),
    /** Required if `contractor` = `yes`. */
    email: z.string().optional(),
    phone: z.string().optional(),
    /** Required if `contractor` = `yes`. */
    contact_person: z.string().optional(),
    /** Required if `contractor` = `yes`. */
    postcode: z.string().optional(),
    /** Required if `contractor` = `yes`. */
    housenumber: z.union([z.string(), z.number()]).optional(),
    suffix: z.string().optional(),
    /** Required if `contractor` = `yes`. */
    streetname: z.string().optional(),
    /** Required if `contractor` = `yes`. */
    city: z.string().optional(),
    /** Chamber of commerce number (required if `contractor` = `yes`). */
    coc: z.string().optional(),
    /** BTW/VAT number (required if `contractor` = `yes`). */
    vat: z.string().optional(),
    website: z.string().optional(),
    /** The organisation logo. */
    logo: OrganisationLogoInputSchema.optional(),
  })
  .passthrough();
export type OrganisationInput = z.input<typeof OrganisationInputSchema>;

/** Body for {@link UsersClient.invite}. */
export const InviteUserInputSchema = z
  .object({
    /** Email of the user; becomes their Salesdock username. */
    email: z.string(),
    /** Role: `agent`, `teamleader`, `organisationadmin` or `admin`. */
    role: z.string(),
    /** The organisation the user belongs to. */
    organisation_id: idSchema,
    /** Team id — only required when the user is a `teamleader`. */
    team_id: idSchema.optional(),
  })
  .passthrough();
export type InviteUserInput = z.input<typeof InviteUserInputSchema>;

/** Query parameters for {@link UsersClient.list}. */
export interface ListUsersParams {
  /** Date field to filter on: `created_date`, `updated_date` or `deactivated_date`. */
  period_filter_on?: "created_date" | "updated_date" | "deactivated_date";
  /** Period preset: `today`, `yesterday`, `this_week`, `last_week`, `last_30_days`, `this_month`, `last_month`, `custom`. */
  period?: string;
  /** Start date when `period` is `custom`. */
  period_start?: string;
  /** End date when `period` is `custom`. */
  period_end?: string;
  /** Return the richer user payload (organisation/team objects, address, ...). */
  extended?: boolean;
  /** Page number (offset pagination). */
  page?: number;
}

/**
 * Organisations API — manage organisations within the account. All endpoints
 * use the `account` scope and are available to admin users only.
 */
export class OrganisationsClient extends BaseResource {
  /** List organisations (offset-paginated). */
  list(
    params: { page?: number } = {},
    options?: RequestOptions,
  ): Promise<OffsetPage<OrganisationListItem>> {
    return fetchOffsetPage(
      this.http,
      OrganisationListItemSchema,
      ["account", "organisations"],
      params as QueryParams,
      options,
    );
  }

  /** Retrieve a single organisation by id. */
  get(organisationId: number | string, options?: RequestOptions): Promise<Organisation> {
    return this.http.request({
      method: "GET",
      segments: ["account", "organisations", organisationId],
      dataSchema: OrganisationSchema,
      options,
    });
  }

  /** Create an organisation. */
  create(input: OrganisationInput, options?: RequestOptions): Promise<MutateOrganisationResult> {
    const body = this.parseInput(OrganisationInputSchema, input, "users.organisations.create");
    return this.http.request({
      method: "POST",
      segments: ["account", "organisations"],
      dataSchema: MutateOrganisationResultSchema,
      body,
      options,
    });
  }

  /** Update an organisation by id. */
  update(
    organisationId: number | string,
    input: OrganisationInput,
    options?: RequestOptions,
  ): Promise<MutateOrganisationResult> {
    const body = this.parseInput(OrganisationInputSchema, input, "users.organisations.update");
    return this.http.request({
      method: "PUT",
      segments: ["account", "organisations", organisationId],
      dataSchema: MutateOrganisationResultSchema,
      body,
      options,
    });
  }

  /** Delete an organisation by id (only allowed when it has no users). */
  delete(
    organisationId: number | string,
    options?: RequestOptions,
  ): Promise<MutateOrganisationResult> {
    return this.http.request({
      method: "DELETE",
      segments: ["account", "organisations", organisationId],
      dataSchema: MutateOrganisationResultSchema,
      options,
    });
  }

  /** List the product ids accessible to users of an organisation. */
  listProducts(
    organisationId: number | string,
    options?: RequestOptions,
  ): Promise<OrganisationProducts> {
    return this.http.request({
      method: "GET",
      segments: ["account", "organisations", organisationId, "products"],
      dataSchema: OrganisationProductsSchema,
      options,
    });
  }
}

/**
 * Users API — list account users and invite new ones. All endpoints use the
 * `account` scope and are available to admin users only.
 */
export class UsersClient extends BaseResource {
  /** Organisations sub-resource. */
  readonly organisations: OrganisationsClient;

  constructor(http: HttpClient, config: ResolvedConfig) {
    super(http, config);
    this.organisations = new OrganisationsClient(http, config);
  }

  /** List account users (offset-paginated). */
  list(params: ListUsersParams = {}, options?: RequestOptions): Promise<OffsetPage<User>> {
    return fetchOffsetPage(
      this.http,
      UserSchema,
      ["account", "users"],
      params as QueryParams,
      options,
    );
  }

  /** Invite a user by email; sends them a Salesdock registration link. */
  invite(input: InviteUserInput, options?: RequestOptions): Promise<unknown> {
    const body = this.parseInput(InviteUserInputSchema, input, "users.invite");
    return this.http.request({
      method: "POST",
      segments: ["account", "invitation"],
      dataSchema: z.unknown(),
      body,
      options,
    });
  }
}
