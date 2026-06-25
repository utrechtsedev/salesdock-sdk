import { z } from "zod";
import { BaseResource } from "./base.js";
import { idSchema, loose, nullish } from "../schemas/common.js";
import { fetchCursorPage, type CursorPage } from "../core/pagination.js";
import type { HttpClient } from "../core/http.js";
import type { ResolvedConfig } from "../core/config.js";
import type { QueryParams, RequestOptions } from "../core/types.js";

/* -------------------------------------------------------------------------- */
/* Shared shapes                                                              */
/* -------------------------------------------------------------------------- */

/**
 * A configurable extra field / question as embedded in lead responses. Keyed by
 * its identifier, each entry carries a label, type and value. The API sometimes
 * returns an empty array `[]` instead of an object when there are none.
 */
const leadFieldEntrySchema = loose({
  label: nullish(z.string()),
  type: nullish(z.string()),
  value: z.unknown().optional(),
});

/** Either a keyed map of extra-field/question entries, or an empty array. */
const leadFieldMapSchema = z.union([z.record(leadFieldEntrySchema), z.array(z.unknown())]);

/** A label attached to a lead. */
export const LeadLabelSchema = loose({
  id: idSchema,
  label: nullish(z.string()),
  identifier: nullish(z.string()),
});
export type LeadLabel = z.infer<typeof LeadLabelSchema>;

/** A user reference (id + name) embedded in lead history / results. */
const leadUserRefSchema = loose({
  id: nullish(idSchema),
  name: nullish(z.string()),
});

/** A single entry in a lead's history. `type_data` shape varies by `type`. */
export const LeadHistoryEntrySchema = loose({
  type: nullish(z.string()),
  modified_at: nullish(z.string()),
  previous_status: nullish(z.string()),
  new_status: nullish(z.string()),
  user: leadUserRefSchema.optional(),
  type_data: z.unknown().optional(),
});
export type LeadHistoryEntry = z.infer<typeof LeadHistoryEntrySchema>;

/* -------------------------------------------------------------------------- */
/* Townships                                                                  */
/* -------------------------------------------------------------------------- */

/** A township (geographic area) as returned by the townships endpoint. */
export const TownshipSchema = loose({
  id: idSchema,
  identifier: nullish(z.string()),
  label: nullish(z.string()),
  active: nullish(z.union([z.number(), z.string(), z.boolean()])),
  boundaries: z.array(z.string()).optional(),
});
export type Township = z.infer<typeof TownshipSchema>;

/** Query parameters for {@link TownshipsClient.list}. */
export interface ListTownshipsParams {
  /** Filter by active state: `1` (active) or `0` (inactive). Omit for all. */
  active?: 0 | 1;
}

/**
 * Townships API — list lead townships (geographic areas). Admin-only; always
 * uses the `account` scope.
 */
export class TownshipsClient extends BaseResource {
  /** List townships (always `account` scope, admin only). */
  list(params: ListTownshipsParams = {}, options?: RequestOptions): Promise<Township[]> {
    return this.http.request({
      method: "GET",
      segments: ["account", "leads", "townships"],
      dataSchema: z.array(TownshipSchema),
      query: params as QueryParams,
      options,
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Lead response shapes                                                       */
/* -------------------------------------------------------------------------- */

/** A lead as returned in the cursor-paginated list response. */
export const LeadListItemSchema = loose({
  id: idSchema,
  business: nullish(z.union([z.boolean(), z.string(), z.number()])),
  gender: nullish(z.string()),
  firstname: nullish(z.string()),
  lastname: nullish(z.string()),
  postcode: nullish(z.string()),
  housenumber: nullish(z.union([z.string(), z.number()])),
  suffix: nullish(z.string()),
  streetname: nullish(z.string()),
  city: nullish(z.string()),
  email: nullish(z.string()),
  company_name: nullish(z.string()),
  activity: nullish(z.string()),
  locked: nullish(z.union([z.boolean(), z.string(), z.number()])),
  status: nullish(z.string()),
  created_by: nullish(idSchema),
  planned_user_id: nullish(idSchema),
  planned_date: nullish(z.string()),
  planned_by: nullish(idSchema),
  planned_at: nullish(z.string()),
  planned_from: nullish(z.string()),
  planned_to: nullish(z.string()),
  completed_at: nullish(z.string()),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
  planned_to_username: nullish(z.string()),
  completed_by_username: nullish(z.string()),
  relative_distance: nullish(z.number()),
  filter_status: nullish(z.string()),
  name: nullish(z.string()),
  address: nullish(z.string()),
  organisation_id: nullish(idSchema),
  township_id: nullish(idSchema),
  latitude: nullish(z.union([z.number(), z.string()])),
  longitude: nullish(z.union([z.number(), z.string()])),
  extrafields: leadFieldMapSchema.optional(),
  questions: leadFieldMapSchema.optional(),
  labels: z.array(LeadLabelSchema).optional(),
  history: z.array(LeadHistoryEntrySchema).optional(),
});
export type LeadListItem = z.infer<typeof LeadListItemSchema>;

/** A single lead with full detail. */
export const LeadSchema = loose({
  id: idSchema,
  origin: nullish(z.string()),
  business: nullish(z.union([z.boolean(), z.string(), z.number()])),
  gender: nullish(z.string()),
  firstname: nullish(z.string()),
  lastname: nullish(z.string()),
  birthdate: nullish(z.string()),
  email: nullish(z.string()),
  phone: nullish(z.string()),
  company_name: nullish(z.string()),
  contact_person: nullish(z.string()),
  coc: nullish(z.string()),
  vat: nullish(z.string()),
  postcode: nullish(z.string()),
  housenumber: nullish(z.union([z.string(), z.number()])),
  suffix: nullish(z.string()),
  streetname: nullish(z.string()),
  city: nullish(z.string()),
  country: nullish(z.string()),
  activity: nullish(z.string()),
  organisation_id: nullish(idSchema),
  township_id: nullish(idSchema),
  latitude: nullish(z.union([z.number(), z.string()])),
  longitude: nullish(z.union([z.number(), z.string()])),
  imported_file_name: nullish(z.string()),
  locked: nullish(z.union([z.boolean(), z.string(), z.number()])),
  status: nullish(z.string()),
  created_by: nullish(idSchema),
  planned_user_id: nullish(idSchema),
  planned_date: nullish(z.string()),
  planned_by: nullish(idSchema),
  planned_at: nullish(z.string()),
  planned_from: nullish(z.string()),
  planned_to: nullish(z.string()),
  completed_at: nullish(z.string()),
  completed_team_id: nullish(idSchema),
  completed_by: nullish(idSchema),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
  extrafields: leadFieldMapSchema.optional(),
  questions: leadFieldMapSchema.optional(),
  labels: z.array(LeadLabelSchema).optional(),
  history: z.array(LeadHistoryEntrySchema).optional(),
});
export type Lead = z.infer<typeof LeadSchema>;

/** A lead activity (appointment / calling / d2d / ...). */
export const LeadActivitySchema = loose({
  id: idSchema,
  identifier: nullish(z.string()),
  label: nullish(z.string()),
  type: nullish(z.string()),
});
export type LeadActivity = z.infer<typeof LeadActivitySchema>;

/** A lead source (campaign / channel). */
export const LeadSourceSchema = loose({
  id: idSchema,
  identifier: nullish(z.string()),
  label: nullish(z.string()),
});
export type LeadSource = z.infer<typeof LeadSourceSchema>;

/** A lead form (template) summary. */
export const LeadFormSchema = loose({
  id: idSchema,
  identifier: nullish(z.string()),
  label: nullish(z.string()),
  description: nullish(z.string()),
  active: nullish(z.boolean()),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
});
export type LeadForm = z.infer<typeof LeadFormSchema>;

/** A single element/field definition of a lead form. */
export const LeadFormElementSchema = loose({
  id: idSchema,
  identifier: nullish(z.string()),
  input_type: nullish(z.string()),
  label: nullish(z.string()),
  description: nullish(z.string()),
  filled_by_client: nullish(z.boolean()),
  filled_by_agent: nullish(z.boolean()),
  lead_component: nullish(z.boolean()),
  format: z.unknown().optional(),
});
export type LeadFormElement = z.infer<typeof LeadFormElementSchema>;

/** A lead result row (a logged action/visit/call against a lead). */
export const LeadResultSchema = loose({
  created_at: nullish(z.string()),
  result_at: nullish(z.string()),
  action: nullish(z.string()),
  previous_status: nullish(z.string()),
  new_status: nullish(z.string()),
  contact_established: nullish(z.boolean()),
  sales_opportunity: nullish(z.boolean()),
  not_reached: nullish(z.boolean()),
  appointment: nullish(z.boolean()),
  latitude: nullish(z.union([z.number(), z.string()])),
  longitude: nullish(z.union([z.number(), z.string()])),
  distance: nullish(z.union([z.number(), z.string()])),
  result_latitude: nullish(z.union([z.number(), z.string()])),
  result_longitude: nullish(z.union([z.number(), z.string()])),
  result_distance: nullish(z.union([z.number(), z.string()])),
  user: leadUserRefSchema.optional(),
  organisation: loose({
    id: nullish(idSchema),
    name: nullish(z.string()),
    identifier: nullish(z.string()),
  }).optional(),
  team: nullish(
    loose({
      id: nullish(idSchema),
      name: nullish(z.string()),
    }),
  ),
  township: nullish(
    loose({
      id: nullish(idSchema),
      name: nullish(z.string()),
    }),
  ),
  lead: loose({ id: idSchema }).optional(),
});
export type LeadResult = z.infer<typeof LeadResultSchema>;

/** A lead status definition from the statuses list. */
export const LeadStatusSchema = loose({
  source: nullish(z.string()),
  id: nullish(idSchema),
  name: nullish(z.string()),
  text: nullish(z.string()),
  type: nullish(z.string()),
  source_data: loose({
    contact_established: nullish(z.boolean()),
    sales_opportunity: nullish(z.boolean()),
    activities: nullish(z.array(z.string())),
  }).optional(),
});
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

/** A lead's printable form rendered to a base64-encoded PDF. */
export const LeadFormPdfSchema = loose({
  name: nullish(z.string()),
  /** Base64-encoded PDF bytes. Decode it yourself; the SDK keeps it as a string. */
  content: z.string(),
});
export type LeadFormPdf = z.infer<typeof LeadFormPdfSchema>;

/** Result of creating/updating a lead: the affected lead's id. */
export const MutateLeadResultSchema = loose({ lead_id: idSchema });
export type MutateLeadResult = z.infer<typeof MutateLeadResultSchema>;

/** Result of creating a lead form instance. */
export const CreateLeadFormInstanceResultSchema = loose({
  form_instance_id: idSchema,
  lead_id: idSchema,
});
export type CreateLeadFormInstanceResult = z.infer<typeof CreateLeadFormInstanceResultSchema>;

/* -------------------------------------------------------------------------- */
/* Query param interfaces                                                     */
/* -------------------------------------------------------------------------- */

/** Query parameters for {@link LeadsClient.list}. */
export interface ListLeadsParams {
  /** Date field to filter on: `created_date`, `updated_date`, `planned_date`, `completed_date`, `deleted_date`. */
  period_filter_on?:
    | "created_date"
    | "updated_date"
    | "planned_date"
    | "completed_date"
    | "deleted_date";
  /** Period preset: `custom`, `today`, `yesterday`, `this_week`, `last_week`, `last_30_days`, `this_month`, `last_month`, `this_year`. */
  period?: string;
  /** Start date when `period` is `custom`. */
  period_start?: string;
  /** End date when `period` is `custom`. */
  period_end?: string;
  /** One or more lead statuses to filter on (serialized as `statuses[]`). */
  statuses?: string[];
  /** Filter by lead activity. */
  activity?: string;
  /** Whether the lead is assigned to a team: `all`, `yes`, or `no`. */
  with_team_id?: "all" | "yes" | "no";
  /** Override the default sort order, e.g. `id_desc`, `updated_at_desc`, `planned_date_asc`. */
  sort_by?: string;
}

/** Query parameters for {@link LeadsClient.listResults}. */
export interface ListLeadResultsParams {
  /** Period preset: `custom`, `today`, `yesterday`, `this_week`, ... */
  period?: string;
  /** Start date when `period` is `custom`. */
  period_start?: string;
  /** End date when `period` is `custom`. */
  period_end?: string;
}

/** Query parameters for {@link LeadsClient.listStatuses}. */
export interface ListLeadStatusesParams {
  /** Filter statuses by source/module, e.g. `lead`. */
  status_source?: string;
}

/* -------------------------------------------------------------------------- */
/* Input schemas                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Body for creating/updating a lead as an admin (`account` scope). Supports
 * `assign`/`user` to assign the lead, plus dynamic `cf_*` (custom field) and
 * `question_*` keys (passthrough lets you send those freely).
 */
export const CreateLeadAsAdminSchema = z
  .object({
    /** Lead activity identifier, e.g. `calling`. */
    activity: z.string().optional(),
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
    coc: z.string().optional(),
    vat: z.string().optional(),
    /** How to assign the lead, e.g. `user`. */
    assign: z.string().optional(),
    /** The user id to assign the lead to. */
    user: idSchema.optional(),
    /** Whether to plan the lead for a date: `1`/`0`. */
    planned_for_date: z.union([z.string(), z.number()]).optional(),
    /** Planned date in `dd-mm-yyyy` format. */
    planned_date: z.string().optional(),
    /** Planned start time in `hh:mm` format. */
    start_at: z.string().optional(),
    /** Planned end time in `hh:mm` format. */
    end_at: z.string().optional(),
    /** The lead source id. */
    lead_source_id: idSchema.optional(),
    /** Label ids to attach to the lead. */
    labels: z.array(idSchema).optional(),
  })
  .passthrough();
export type CreateLeadAsAdminInput = z.input<typeof CreateLeadAsAdminSchema>;

/** Body for updating a lead as an admin (`account` scope). */
export const UpdateLeadAsAdminSchema = CreateLeadAsAdminSchema;
export type UpdateLeadAsAdminInput = z.input<typeof UpdateLeadAsAdminSchema>;

/**
 * Body for creating/updating a lead as a reseller (`user` scope). Same shape as
 * the admin body minus the `assign` field; dynamic `cf_*`/`question_*` keys are
 * passed through.
 */
export const CreateLeadAsResellerSchema = z
  .object({
    activity: z.string().optional(),
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
    coc: z.string().optional(),
    vat: z.string().optional(),
    /** The user id to assign the lead to. */
    user: idSchema.optional(),
    /** Whether to plan the lead for a date: `1`/`0`. */
    planned_for_date: z.union([z.string(), z.number()]).optional(),
    /** Planned date in `dd-mm-yyyy` format. */
    planned_date: z.string().optional(),
    /** Planned start time in `hh:mm` format. */
    start_at: z.string().optional(),
    /** Planned end time in `hh:mm` format. */
    end_at: z.string().optional(),
    /** The lead source id. */
    lead_source_id: idSchema.optional(),
    /** Label ids to attach to the lead. */
    labels: z.array(idSchema).optional(),
  })
  .passthrough();
export type CreateLeadAsResellerInput = z.input<typeof CreateLeadAsResellerSchema>;

/** Body for updating a lead as a reseller (`user` scope). */
export const UpdateLeadAsResellerSchema = CreateLeadAsResellerSchema;
export type UpdateLeadAsResellerInput = z.input<typeof UpdateLeadAsResellerSchema>;

/** Body for {@link LeadsClient.updateStatus}. */
export const UpdateLeadStatusSchema = z
  .object({
    /** The new status identifier, e.g. `afspraak`. */
    status: z.string(),
    /** Optional remark accompanying the status change. */
    remark: z.string().optional(),
  })
  .passthrough();
export type UpdateLeadStatusInput = z.input<typeof UpdateLeadStatusSchema>;

/** Body for {@link LeadsClient.createFormInstance}. */
export const CreateLeadFormInstanceSchema = z
  .object({
    /** Answers keyed by form element identifier. */
    questionData: z.record(z.unknown()).optional(),
    /** The client's name. */
    client_name: z.string().optional(),
    /** The client's email address. */
    client_email: z.string().optional(),
    /** The client's phone number. */
    client_phone: z.string().optional(),
  })
  .passthrough();
export type CreateLeadFormInstanceInput = z.input<typeof CreateLeadFormInstanceSchema>;

/* -------------------------------------------------------------------------- */
/* Client                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Leads API — manage leads, their results, history, forms and statuses.
 *
 * Scope handling per endpoint mirrors the Salesdock API: list/get/activities/
 * sources/results/history/forms/statuses honor the configured scope, while
 * admin create/update + status updates are always `account` scope and reseller
 * create/update are always `user` scope. Use {@link LeadsClient.townships} for
 * townships.
 */
export class LeadsClient extends BaseResource {
  /** Townships sub-client (admin-only, `account` scope). */
  readonly townships: TownshipsClient;

  constructor(http: HttpClient, config: ResolvedConfig) {
    super(http, config);
    this.townships = new TownshipsClient(http, config);
  }

  /** List leads (cursor-paginated). Honors the configured scope. */
  list(params: ListLeadsParams = {}, options?: RequestOptions): Promise<CursorPage<LeadListItem>> {
    return fetchCursorPage(
      this.http,
      LeadListItemSchema,
      [this.scope(options), "leads"],
      params as QueryParams,
      options,
    );
  }

  /** Retrieve a single lead by id. Honors the configured scope. */
  get(leadId: number | string, options?: RequestOptions): Promise<Lead> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "leads", leadId],
      dataSchema: LeadSchema,
      options,
    });
  }

  /** List the available lead activities. Honors the configured scope. */
  listActivities(options?: RequestOptions): Promise<LeadActivity[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "leads", "activities"],
      dataSchema: z.array(LeadActivitySchema),
      options,
    });
  }

  /** List the available lead sources. Honors the configured scope. */
  listSources(options?: RequestOptions): Promise<LeadSource[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "leads", "sources"],
      dataSchema: z.array(LeadSourceSchema),
      options,
    });
  }

  /** Create a lead as an admin (always `account` scope). */
  createAsAdmin(
    input: CreateLeadAsAdminInput,
    options?: RequestOptions,
  ): Promise<MutateLeadResult> {
    const body = this.parseInput(CreateLeadAsAdminSchema, input, "leads.createAsAdmin");
    return this.http.request({
      method: "POST",
      segments: ["account", "leads"],
      dataSchema: MutateLeadResultSchema,
      body,
      options,
    });
  }

  /** Update a lead by id as an admin (always `account` scope). */
  updateAsAdmin(
    leadId: number | string,
    input: UpdateLeadAsAdminInput,
    options?: RequestOptions,
  ): Promise<MutateLeadResult> {
    const body = this.parseInput(UpdateLeadAsAdminSchema, input, "leads.updateAsAdmin");
    return this.http.request({
      method: "PUT",
      segments: ["account", "leads", leadId],
      dataSchema: MutateLeadResultSchema,
      body,
      options,
    });
  }

  /** Create a lead as a reseller (always `user` scope). */
  createAsReseller(
    input: CreateLeadAsResellerInput,
    options?: RequestOptions,
  ): Promise<MutateLeadResult> {
    const body = this.parseInput(CreateLeadAsResellerSchema, input, "leads.createAsReseller");
    return this.http.request({
      method: "POST",
      segments: ["user", "leads"],
      dataSchema: MutateLeadResultSchema,
      body,
      options,
    });
  }

  /** Update a lead by id as a reseller (always `user` scope). */
  updateAsReseller(
    leadId: number | string,
    input: UpdateLeadAsResellerInput,
    options?: RequestOptions,
  ): Promise<MutateLeadResult> {
    const body = this.parseInput(UpdateLeadAsResellerSchema, input, "leads.updateAsReseller");
    return this.http.request({
      method: "PUT",
      segments: ["user", "leads", leadId],
      dataSchema: MutateLeadResultSchema,
      body,
      options,
    });
  }

  /** Retrieve a lead's form rendered as a base64-encoded PDF. Honors the configured scope. */
  getFormPdf(leadId: number | string, options?: RequestOptions): Promise<LeadFormPdf> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "leads", leadId, "form", "pdf"],
      dataSchema: LeadFormPdfSchema,
      options,
    });
  }

  /** Retrieve the change history of a lead. Honors the configured scope. */
  getHistory(leadId: number | string, options?: RequestOptions): Promise<LeadHistoryEntry[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "leads", leadId, "history"],
      dataSchema: z.array(LeadHistoryEntrySchema),
      options,
    });
  }

  /** Retrieve the results (logged actions) for a single lead. Honors the configured scope. */
  getResults(leadId: number | string, options?: RequestOptions): Promise<LeadResult[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "leads", leadId, "results"],
      dataSchema: z.array(LeadResultSchema),
      options,
    });
  }

  /** List lead results across leads (cursor-paginated). Honors the configured scope. */
  listResults(
    params: ListLeadResultsParams = {},
    options?: RequestOptions,
  ): Promise<CursorPage<LeadResult>> {
    return fetchCursorPage(
      this.http,
      LeadResultSchema,
      [this.scope(options), "leads", "results"],
      params as QueryParams,
      options,
    );
  }

  /** Update a lead's status (always `account` scope). */
  updateStatus(
    leadId: number | string,
    input: UpdateLeadStatusInput,
    options?: RequestOptions,
  ): Promise<unknown> {
    const body = this.parseInput(UpdateLeadStatusSchema, input, "leads.updateStatus");
    return this.http.request({
      method: "POST",
      segments: ["account", "leads", "status", leadId],
      dataSchema: z.unknown(),
      body,
      options,
    });
  }

  /** List lead forms (templates). Honors the configured scope. */
  listForms(options?: RequestOptions): Promise<LeadForm[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "leads", "forms"],
      dataSchema: z.array(LeadFormSchema),
      options,
    });
  }

  /** List the elements/fields of a lead form. Honors the configured scope. */
  getFormElements(
    leadFormId: number | string,
    options?: RequestOptions,
  ): Promise<LeadFormElement[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "leads", "forms", leadFormId, "elements"],
      dataSchema: z.array(LeadFormElementSchema),
      options,
    });
  }

  /** Create a lead form instance (no scope segment). */
  createFormInstance(
    leadFormId: number | string,
    input: CreateLeadFormInstanceInput,
    options?: RequestOptions,
  ): Promise<CreateLeadFormInstanceResult> {
    const body = this.parseInput(CreateLeadFormInstanceSchema, input, "leads.createFormInstance");
    return this.http.request({
      method: "POST",
      segments: ["leads", "forms", leadFormId, "instances"],
      dataSchema: CreateLeadFormInstanceResultSchema,
      body,
      options,
    });
  }

  /** List lead statuses. Honors the configured scope. */
  listStatuses(
    params: ListLeadStatusesParams = {},
    options?: RequestOptions,
  ): Promise<LeadStatus[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "statuses"],
      dataSchema: z.array(LeadStatusSchema),
      query: params as QueryParams,
      options,
    });
  }
}
