import type { Scope } from "./config.js";

/** A primitive that can appear in a query string. */
export type QueryPrimitive = string | number | boolean;

/**
 * Query parameters. Values may be primitives, arrays (repeated/`key[]` style),
 * or `null`/`undefined` (omitted). Objects are not supported.
 */
export type QueryParams = Record<string, QueryPrimitive | QueryPrimitive[] | null | undefined>;

/** The standard Salesdock response envelope. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

/** A single link entry in an offset-paginated response. */
export interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

/**
 * Offset (page-number) pagination metadata, mirroring Laravel's paginator.
 * The `data` field holds the items for the current page.
 */
export interface OffsetPaginated<T> {
  current_page: number;
  data: T[];
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  links?: PaginationLink[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

/** Cursor pagination metadata. The `data` field holds the current page items. */
export interface CursorPaginated<T> {
  path: string;
  per_page: number;
  next_cursor: string | null;
  next_page_url: string | null;
  prev_cursor: string | null;
  prev_page_url: string | null;
  data: T[];
}

/** Per-call options accepted by every resource method. */
export interface RequestOptions {
  /** Override the configured scope for this single call (scope-flexible endpoints only). */
  scope?: Scope;
  /** An `AbortSignal` to cancel this request. */
  signal?: AbortSignal;
  /** Extra headers merged into this request. */
  headers?: Record<string, string>;
  /** Override the configured per-request timeout (ms) for this call. */
  timeout?: number;
  /**
   * Whether this request is safe to retry on transient server (5xx) or network
   * errors. Defaults to `true` for `GET` and `false` for mutating methods
   * (`POST`/`PUT`/`PATCH`/`DELETE`) so non-idempotent writes are never silently
   * duplicated. Set `true` to opt a mutating call into retries (e.g. when the
   * endpoint is idempotent or you pass your own dedupe key). Throttling (HTTP
   * 429) is always retried regardless of this flag, since it means the request
   * was rejected before processing.
   */
  idempotent?: boolean;
}
