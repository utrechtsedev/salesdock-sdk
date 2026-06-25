import type { ZodError } from "zod";

/** Field-level validation errors as returned by the Salesdock API. */
export type ApiFieldErrors = Record<string, string[]>;

/** Shape of a Salesdock error envelope (best-effort; fields may be absent). */
export interface ApiErrorBody {
  success?: boolean;
  message?: string;
  code?: number;
  errors?: ApiFieldErrors;
  [key: string]: unknown;
}

export interface SalesdockErrorOptions {
  status?: number;
  code?: number;
  body?: unknown;
  errors?: ApiFieldErrors;
  url?: string;
  method?: string;
  cause?: unknown;
  retryAfterMs?: number;
}

/**
 * Base class for every error thrown by the SDK. Catch this to handle all
 * Salesdock failures uniformly, or catch a subclass for specific handling.
 */
export class SalesdockError extends Error {
  /** HTTP status code, when the error originated from an HTTP response. */
  readonly status?: number;
  /** Application-level `code` from the error envelope, when present. */
  readonly code?: number;
  /** Raw parsed response body, when available. */
  readonly body?: unknown;
  /** Field-level validation errors, when the API returned them. */
  readonly errors?: ApiFieldErrors;
  /** Request URL that produced the error. */
  readonly url?: string;
  /** Request method that produced the error. */
  readonly method?: string;
  /** Suggested retry delay in ms (from `Retry-After`), when applicable. */
  readonly retryAfterMs?: number;

  constructor(message: string, options: SalesdockErrorOptions = {}) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.status = options.status;
    this.code = options.code;
    this.body = options.body;
    this.errors = options.errors;
    this.url = options.url;
    this.method = options.method;
    this.retryAfterMs = options.retryAfterMs;
    // Maintain prototype chain when compiled down to ES5-ish targets.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** 400 Bad Request / 422 Unprocessable Entity — request data was invalid. */
export class SalesdockValidationError extends SalesdockError {}

/** 401 Unauthorized — missing or wrong API token. */
export class SalesdockAuthenticationError extends SalesdockError {}

/** 403 Forbidden — no access to the account, or token not IP-whitelisted. */
export class SalesdockForbiddenError extends SalesdockError {}

/** 404 Not Found — entity or URL does not exist. */
export class SalesdockNotFoundError extends SalesdockError {}

/** 405 Method Not Allowed — endpoint does not support this HTTP method. */
export class SalesdockMethodNotAllowedError extends SalesdockError {}

/** 429 Too Many Requests — throttling limit reached (120 req/min). */
export class SalesdockRateLimitError extends SalesdockError {}

/** 5xx — server-side error at Salesdock. */
export class SalesdockServerError extends SalesdockError {}

/** Network failure, DNS error, or timeout — no HTTP response was received. */
export class SalesdockConnectionError extends SalesdockError {}

/** The request timed out (the per-request timeout elapsed). */
export class SalesdockTimeoutError extends SalesdockConnectionError {}

/**
 * Local request validation failed: the arguments you passed did not match the
 * expected schema. Thrown before any network call. Wraps the underlying
 * {@link https://zod.dev | Zod} error.
 */
export class SalesdockInvalidRequestError extends SalesdockError {
  readonly zodError: ZodError;
  constructor(message: string, zodError: ZodError, options: SalesdockErrorOptions = {}) {
    super(message, options);
    this.zodError = zodError;
  }
}

/**
 * The API responded with a body that did not match the expected schema. Thrown
 * only when response validation is enabled. Wraps the underlying Zod error and
 * exposes the raw `body` for inspection.
 */
export class SalesdockResponseValidationError extends SalesdockError {
  readonly zodError: ZodError;
  constructor(message: string, zodError: ZodError, options: SalesdockErrorOptions = {}) {
    super(message, options);
    this.zodError = zodError;
  }
}

/**
 * Build the appropriate error subclass for an HTTP error response.
 */
export function errorFromResponse(
  status: number,
  body: ApiErrorBody | unknown,
  context: { url: string; method: string; retryAfterMs?: number },
): SalesdockError {
  const parsed = (body && typeof body === "object" ? body : {}) as ApiErrorBody;
  const rawTextMessage =
    typeof body === "string" && body.trim() ? body.trim().slice(0, 500) : undefined;
  const message =
    (typeof parsed.message === "string" && parsed.message) ||
    rawTextMessage ||
    defaultMessageForStatus(status);
  const options: SalesdockErrorOptions = {
    status,
    code: typeof parsed.code === "number" ? parsed.code : undefined,
    body,
    errors: parsed.errors,
    url: context.url,
    method: context.method,
    retryAfterMs: context.retryAfterMs,
  };

  switch (status) {
    case 400:
    case 422:
      return new SalesdockValidationError(message, options);
    case 401:
      return new SalesdockAuthenticationError(message, options);
    case 403:
      return new SalesdockForbiddenError(message, options);
    case 404:
      return new SalesdockNotFoundError(message, options);
    case 405:
      return new SalesdockMethodNotAllowedError(message, options);
    case 429:
      return new SalesdockRateLimitError(message, options);
    default:
      if (status >= 500) return new SalesdockServerError(message, options);
      return new SalesdockError(message, options);
  }
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "Bad request";
    case 401:
      return "Unauthorized";
    case 403:
      return "Forbidden";
    case 404:
      return "Not found";
    case 405:
      return "Method not allowed";
    case 422:
      return "Unprocessable entity";
    case 429:
      return "Too many requests";
    default:
      return status >= 500 ? "Server error" : `Request failed with status ${status}`;
  }
}
