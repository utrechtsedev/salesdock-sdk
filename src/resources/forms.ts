import { z } from "zod";
import { BaseResource } from "./base.js";
import { idSchema, loose, nullish } from "../schemas/common.js";
import { fetchOffsetPage, type OffsetPage } from "../core/pagination.js";
import type { QueryParams, RequestOptions } from "../core/types.js";

/** A form as returned in the {@link FormsClient.list} response. */
export const FormSchema = loose({
  id: idSchema,
  name: nullish(z.string()),
});
export type Form = z.infer<typeof FormSchema>;

/** A single form element as returned by {@link FormsClient.getElements}. */
export const FormElementSchema = loose({
  id: idSchema,
  name: nullish(z.string()),
  identifier: nullish(z.string()),
  input_type: nullish(z.string()),
  description: nullish(z.string()),
});
export type FormElement = z.infer<typeof FormElementSchema>;

/** A form instance as returned in the {@link FormsClient.listInstances} response. */
export const FormInstanceListItemSchema = loose({
  id: idSchema,
  title: nullish(z.string()),
  status: nullish(z.string()),
  status_remark: nullish(z.string()),
  organisation_name: nullish(z.string()),
  agent: nullish(z.string()),
  client_info: z
    .union([
      loose({
        client_name_for_receiving_confirmation_email: nullish(z.string()),
        client_email_for_receiving_confirmation_email: nullish(z.string()),
      }),
      z.array(z.unknown()),
    ])
    .optional(),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
});
export type FormInstanceListItem = z.infer<typeof FormInstanceListItemSchema>;

/** The relation block embedded in a single form instance. */
export const FormInstanceRelationSchema = loose({
  id: idSchema,
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
});
export type FormInstanceRelation = z.infer<typeof FormInstanceRelationSchema>;

/** A single form instance as returned by {@link FormsClient.getInstance}. */
export const FormInstanceSchema = loose({
  id: idSchema,
  title: nullish(z.string()),
  status: nullish(z.string()),
  status_remark: nullish(z.string()),
  agent: nullish(z.string()),
  organisation: nullish(z.string()),
  created_at: nullish(z.string()),
  updated_at: nullish(z.string()),
  relation: FormInstanceRelationSchema.optional(),
  client_name: nullish(z.string()),
  client_email: nullish(z.string()),
  question_data: z.record(z.string(), z.unknown()).optional(),
});
export type FormInstance = z.infer<typeof FormInstanceSchema>;

/** Result of {@link FormsClient.fillInstance}. */
export const FillFormInstanceResultSchema = loose({
  form_instance_id: idSchema,
});
export type FillFormInstanceResult = z.infer<typeof FillFormInstanceResultSchema>;

/** The PDF payload returned by {@link FormsClient.getInstancePdf}. */
export const FormInstancePdfSchema = loose({
  id: idSchema,
  pdf: loose({
    /** The base64-encoded PDF document (not decoded by the SDK). */
    content: nullish(z.string()),
  }).optional(),
});
export type FormInstancePdf = z.infer<typeof FormInstancePdfSchema>;

/** A status entry returned by {@link FormsClient.listStatuses}. */
export const FormStatusSchema = loose({
  source: nullish(z.string()),
  id: nullish(idSchema),
  name: nullish(z.string()),
  text: nullish(z.string()),
  type: nullish(z.string()),
  source_data: nullish(z.unknown()),
});
export type FormStatus = z.infer<typeof FormStatusSchema>;

/** A file value supplied when filling a form instance. */
export const FillFormFileSchema = z
  .object({
    /** The file name, e.g. `"Some file.png"`. */
    name: z.string(),
    /** The file contents as a data URL (e.g. `"data:image/png;base64,..."`). */
    content: z.string(),
  })
  .passthrough();
export type FillFormFile = z.input<typeof FillFormFileSchema>;

/** Body for {@link FormsClient.fillInstance}. */
export const FillFormInstanceSchema = z
  .object({
    /**
     * Answers keyed by element identifier. Values are strings/numbers for most
     * inputs, or an array of `{ name, content }` for `file` elements.
     */
    questionData: z.record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.array(FillFormFileSchema), z.unknown()]),
    ),
    /** Name of the client receiving the confirmation email. */
    client_name: z.string().optional(),
    /** Email of the client receiving the confirmation email. */
    client_email: z.string().optional(),
    /** Phone number of the client. */
    client_phone: z.string().optional(),
  })
  .passthrough();
export type FillFormInstanceInput = z.input<typeof FillFormInstanceSchema>;

/** Query parameters for {@link FormsClient.listInstances}. */
export interface ListFormInstancesParams {
  /** Date field to filter on: `created_date`, `updated_date`, `completed_date`. */
  period_filter_on?: "created_date" | "updated_date" | "completed_date";
  /** Period preset: `custom`, `today`, `yesterday`, `this_week`, ... */
  period?: string;
  /** Start date when `period` is `custom`. */
  period_start?: string;
  /** End date when `period` is `custom`. */
  period_end?: string;
  /** Filter by one or more form statuses. */
  statuses?: string[];
  /** Filter by the id of the originating sale. */
  sale_id?: number | string;
  /** Page number (offset pagination). */
  page?: number;
}

/** Query parameters for {@link FormsClient.listStatuses}. */
export interface ListFormStatusesParams {
  /** The status source to filter on, e.g. `"form"`. */
  status_source?: string;
}

/**
 * Forms API — list forms and their elements, manage form instances, fetch
 * instance PDFs and look up form statuses.
 */
export class FormsClient extends BaseResource {
  /** List the forms available to the user (offset-paginated). Honors the configured scope. */
  list(options?: RequestOptions): Promise<OffsetPage<Form>> {
    return fetchOffsetPage(
      this.http,
      FormSchema,
      [this.scope(options), "forms"],
      undefined,
      options,
    );
  }

  /** Retrieve all elements available for a form. Honors the configured scope. */
  getElements(formId: number | string, options?: RequestOptions): Promise<FormElement[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "forms", formId, "elements"],
      dataSchema: z.array(FormElementSchema),
      options,
    });
  }

  /** List form instances (offset-paginated). Honors the configured scope. */
  listInstances(
    params: ListFormInstancesParams = {},
    options?: RequestOptions,
  ): Promise<OffsetPage<FormInstanceListItem>> {
    return fetchOffsetPage(
      this.http,
      FormInstanceListItemSchema,
      [this.scope(options), "forms", "instances"],
      params as QueryParams,
      options,
    );
  }

  /** Retrieve a single form instance by id. Honors the configured scope. */
  getInstance(formInstanceId: number | string, options?: RequestOptions): Promise<FormInstance> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "forms", "instances", formInstanceId],
      dataSchema: FormInstanceSchema,
      options,
    });
  }

  /** Fill (create) a form instance for a form. This endpoint has no scope segment. */
  fillInstance(
    formId: number | string,
    input: FillFormInstanceInput,
    options?: RequestOptions,
  ): Promise<FillFormInstanceResult> {
    const body = this.parseInput(FillFormInstanceSchema, input, "forms.fillInstance");
    return this.http.request({
      method: "POST",
      segments: ["forms", formId, "instances"],
      dataSchema: FillFormInstanceResultSchema,
      body,
      options,
    });
  }

  /** List the ids of form instances connected to a sale. Honors the configured scope. */
  listInstancesBySale(
    saleId: number | string,
    options?: RequestOptions,
  ): Promise<Array<number | string>> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "forms", "instances", "sale", saleId],
      dataSchema: z.array(idSchema),
      options,
    });
  }

  /** Retrieve a form instance's PDF (base64 content). Honors the configured scope. */
  getInstancePdf(
    formInstanceId: number | string,
    options?: RequestOptions,
  ): Promise<FormInstancePdf> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "forms", "instances", "pdf", formInstanceId],
      dataSchema: FormInstancePdfSchema,
      options,
    });
  }

  /** List the available form statuses. Honors the configured scope. */
  listStatuses(
    params: ListFormStatusesParams = {},
    options?: RequestOptions,
  ): Promise<FormStatus[]> {
    return this.http.request({
      method: "GET",
      segments: [this.scope(options), "statuses"],
      dataSchema: z.array(FormStatusSchema),
      query: params as QueryParams,
      options,
    });
  }
}
