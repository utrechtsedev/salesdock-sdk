import { z } from "zod";

/**
 * Shared Zod building blocks used across every resource.
 *
 * Response object schemas are intentionally *permissive*: they are created with
 * `.passthrough()` so unknown/newly-added fields flow through untouched rather
 * than causing a validation failure. Fields observed as nullable in the API are
 * typed with {@link nullish}. This keeps the SDK resilient to API drift while
 * still type-checking the fields it knows about.
 */

/** `z.object(shape).passthrough()` — the default for response shapes. */
export function loose<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape).passthrough();
}

/** Optional + nullable. The safe default for response fields. */
export function nullish<T extends z.ZodTypeAny>(schema: T) {
  return schema.nullish();
}

/** An id that may arrive as a number or a numeric string. */
export const idSchema = z.union([z.number(), z.string()]);

/**
 * A boolean that the API may encode as a real boolean, the strings `"0"`/`"1"`,
 * or the numbers `0`/`1`.
 */
export const boolishSchema = z.union([
  z.boolean(),
  z.literal("0"),
  z.literal("1"),
  z.literal(0),
  z.literal(1),
]);

/** A date/time string. Salesdock uses `"YYYY-MM-DD HH:MM:SS"` (not strict ISO). */
export const dateTimeSchema = z.string();

/** The standard Salesdock response envelope around a typed payload. */
export function envelopeSchema<T extends z.ZodTypeAny>(data: T) {
  return z
    .object({
      success: z.boolean(),
      data,
      message: z.string().optional(),
    })
    .passthrough();
}

/** A single navigation link inside an offset-paginated response. */
export const paginationLinkSchema = loose({
  url: z.string().nullable(),
  label: z.string(),
  active: z.boolean(),
});

/** Offset (page-number) paginator wrapping an array of `item`. */
export function offsetPaginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return loose({
    current_page: z.number(),
    data: z.array(item),
    first_page_url: z.string().nullable().optional(),
    from: z.number().nullable().optional(),
    last_page: z.number(),
    last_page_url: z.string().nullable().optional(),
    links: z.array(paginationLinkSchema).optional(),
    next_page_url: z.string().nullable().optional(),
    path: z.string().optional(),
    per_page: z.union([z.number(), z.string()]),
    prev_page_url: z.string().nullable().optional(),
    to: z.number().nullable().optional(),
    total: z.number(),
  });
}

/** Cursor paginator wrapping an array of `item`. */
export function cursorPaginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return loose({
    path: z.string().optional(),
    per_page: z.union([z.number(), z.string()]),
    next_cursor: z.string().nullable().optional(),
    next_page_url: z.string().nullable().optional(),
    prev_cursor: z.string().nullable().optional(),
    prev_page_url: z.string().nullable().optional(),
    data: z.array(item),
  });
}

/** A customer/connection address as returned in nested objects. */
export const addressSchema = loose({
  postcode: nullish(z.string()),
  housenumber: nullish(z.union([z.string(), z.number()])),
  suffix: nullish(z.string()),
  streetname: nullish(z.string()),
  city: nullish(z.string()),
});

/** A customer block as embedded in sales/relations responses. */
export const customerSchema = loose({
  gender: nullish(z.string()),
  initials: nullish(z.string()),
  firstname: nullish(z.string()),
  infix: nullish(z.string()),
  lastname: nullish(z.string()),
  birthdate: nullish(z.string()),
  email: nullish(z.string()),
  phone: nullish(z.string()),
  business: nullish(z.union([z.boolean(), z.string(), z.number()])),
  company_name: nullish(z.string()),
  contact_person: nullish(z.string()),
  coc: nullish(z.string()),
  vat: nullish(z.string()),
  iban: nullish(z.string()),
  iban_holder: nullish(z.string()),
  address: addressSchema.optional(),
});

/** A configurable "extra field" attached to many entities. */
export const extraFieldSchema = loose({
  id: idSchema.optional(),
  identifier: nullish(z.string()),
  type: nullish(z.string()),
  label: nullish(z.string()),
  value: z.unknown().optional(),
});

/** A status block embedded in sale/lead/form responses. */
export const statusSchema = loose({
  status_identifier: nullish(z.string()),
  status: nullish(z.string()),
  status_remark: nullish(z.string()),
});

export type Loose = ReturnType<typeof loose>;
