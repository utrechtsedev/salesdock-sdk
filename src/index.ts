/**
 * salesdock — Universal, fully-typed TypeScript SDK for the Salesdock API.
 *
 * @packageDocumentation
 */

export { Salesdock, type RawRequestInit } from "./client.js";

// Configuration
export {
  PRODUCTION_BASE_URL,
  STAGING_BASE_URL,
  DEFAULT_VERSION,
  SDK_VERSION,
  type SalesdockConfig,
  type ResolvedConfig,
  type Scope,
  type FetchLike,
  type RequestHook,
  type ResponseHook,
} from "./core/config.js";

// Errors
export {
  SalesdockError,
  SalesdockValidationError,
  SalesdockAuthenticationError,
  SalesdockForbiddenError,
  SalesdockNotFoundError,
  SalesdockMethodNotAllowedError,
  SalesdockRateLimitError,
  SalesdockServerError,
  SalesdockConnectionError,
  SalesdockTimeoutError,
  SalesdockInvalidRequestError,
  SalesdockResponseValidationError,
  type SalesdockErrorOptions,
  type ApiFieldErrors,
  type ApiErrorBody,
} from "./core/errors.js";

// Core types
export type {
  ApiEnvelope,
  OffsetPaginated,
  CursorPaginated,
  PaginationLink,
  QueryParams,
  QueryPrimitive,
  RequestOptions,
} from "./core/types.js";

// Pagination
export { OffsetPage, CursorPage } from "./core/pagination.js";

// Utilities
export { decodeBase64 } from "./core/base64.js";

// Shared schema building blocks
export * from "./schemas/common.js";

// Resource clients, schemas and types
export { BaseResource } from "./resources/base.js";
export * from "./resources/sales.js";
export * from "./resources/dialer.js";
export * from "./resources/users.js";
export * from "./resources/commissions.js";
export * from "./resources/leads.js";
export * from "./resources/forms.js";
export * from "./resources/relations.js";
export * from "./resources/products.js";
export * from "./resources/tasks.js";
export * from "./resources/webhooks.js";
