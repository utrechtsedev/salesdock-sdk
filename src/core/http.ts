import type { z } from "zod";
import type { ResolvedConfig } from "./config.js";
import { SDK_VERSION } from "./config.js";
import {
  SalesdockError,
  SalesdockConnectionError,
  SalesdockResponseValidationError,
  SalesdockTimeoutError,
  errorFromResponse,
  type ApiErrorBody,
} from "./errors.js";
import { envelopeSchema } from "../schemas/common.js";
import type { QueryParams, RequestOptions } from "./types.js";

/** Internal description of a request to the Salesdock API. */
export interface HttpRequest<TSchema extends z.ZodTypeAny> {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Path segments after `/api/{domain}/{version}/` (scope included by caller). */
  segments: Array<string | number>;
  /** Zod schema for the `data` field of the response envelope. */
  dataSchema: TSchema;
  query?: QueryParams;
  body?: unknown;
  options?: RequestOptions;
}

/** Transient server statuses retried only for idempotent requests. (429 is handled separately and always retried.) */
const RETRYABLE_5XX = new Set([500, 502, 503, 504]);

/**
 * Fetch-based transport. Web-standard only (no Node built-ins), so it runs on
 * Cloudflare Workers, Deno, Bun, browsers and Node 18+.
 */
export class HttpClient {
  constructor(private readonly config: ResolvedConfig) {}

  /** Execute a request and return the validated `data` payload. */
  async request<TSchema extends z.ZodTypeAny>(
    req: HttpRequest<TSchema>,
  ): Promise<z.infer<TSchema>> {
    const url = this.buildUrl(req.segments, req.query);
    return this.send(req.method, url, req.dataSchema, req.body, req.options);
  }

  /** Build a full request URL from path segments and query parameters. */
  buildUrl(segments: Array<string | number>, query?: QueryParams): string {
    const base = `${this.config.baseUrl}/api/${encodeURIComponent(
      this.config.domain,
    )}/${encodeURIComponent(this.config.version)}`;
    const path = segments.map((s) => encodeURIComponent(String(s))).join("/");
    const qs = buildQueryString(query);
    return `${base}/${path}${qs ? `?${qs}` : ""}`;
  }

  private async send<TSchema extends z.ZodTypeAny>(
    method: string,
    url: string,
    dataSchema: TSchema,
    body: unknown,
    options?: RequestOptions,
  ): Promise<z.infer<TSchema>> {
    const headers = this.buildHeaders(body !== undefined, options?.headers);
    const serializedBody = body !== undefined ? JSON.stringify(body) : undefined;

    // Whether transient (5xx / network) failures may be retried for this call.
    // Safe (idempotent) by default for GET only, so non-idempotent writes are
    // never silently re-sent. Throttling (429) is always retried (see below).
    const safeToRetry = options?.idempotent ?? method === "GET";

    const maxAttempts = this.config.maxRetries + 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const isLastAttempt = attempt === maxAttempts - 1;

      await this.config.onRequest?.({ method, url, headers, body: serializedBody });

      const started = nowMs();
      let res: Response;
      try {
        res = await this.fetchWithTimeout(method, url, headers, serializedBody, options);
      } catch (err) {
        lastError = wrapNetworkError(err, url, method);
        // Never retry caller-initiated aborts or timeouts: an abort must take
        // effect immediately, and a timeout is the deadline — retrying it would
        // multiply the effective wait by the attempt count.
        const aborted = options?.signal?.aborted === true;
        const isTimeout = err instanceof SalesdockTimeoutError;
        if (!aborted && !isTimeout && safeToRetry && !isLastAttempt) {
          await sleep(this.backoffDelay(attempt, undefined));
          continue;
        }
        throw lastError;
      }

      const durationMs = nowMs() - started;
      await this.config.onResponse?.({
        method,
        url,
        status: res.status,
        durationMs,
      });

      const { parsedBody, rawText } = await readBody(res);

      const success =
        res.ok &&
        !(
          parsedBody &&
          typeof parsedBody === "object" &&
          (parsedBody as ApiErrorBody).success === false
        );

      if (success) {
        // A successful response with no body (e.g. HTTP 204) carries no data.
        if (parsedBody === undefined) {
          if (!rawText) return undefined as z.infer<TSchema>;
          throw new SalesdockError("Salesdock returned a non-JSON success response body.", {
            status: res.status,
            url,
            method,
            body: rawText,
          });
        }
        return this.validateResponse(dataSchema, parsedBody, url, method);
      }

      // Error path — maybe retry. 429 (throttling) is always retryable because
      // the request was rejected before processing; 5xx only when safeToRetry.
      const retryAfterMs = parseRetryAfter(res.headers.get("retry-after"));
      const statusRetryable = res.status === 429 || (RETRYABLE_5XX.has(res.status) && safeToRetry);
      if (statusRetryable && !isLastAttempt) {
        await sleep(this.backoffDelay(attempt, retryAfterMs));
        continue;
      }

      throw errorFromResponse(res.status, parsedBody ?? rawText, {
        url,
        method,
        retryAfterMs,
      });
    }

    // Unreachable in practice; satisfies the type checker.
    throw lastError instanceof Error
      ? lastError
      : new SalesdockConnectionError("Request failed", { url, method });
  }

  private validateResponse<TSchema extends z.ZodTypeAny>(
    dataSchema: TSchema,
    parsedBody: unknown,
    url: string,
    method: string,
  ): z.infer<TSchema> {
    if (!this.config.validateResponses) {
      // Unwrap the envelope's `data` when present; otherwise return the body
      // as-is rather than silently yielding `undefined` for a non-envelope body.
      if (parsedBody && typeof parsedBody === "object" && "data" in parsedBody) {
        return (parsedBody as { data: unknown }).data as z.infer<TSchema>;
      }
      return parsedBody as z.infer<TSchema>;
    }
    const schema = envelopeSchema(dataSchema);
    const result = schema.safeParse(parsedBody);
    if (!result.success) {
      throw new SalesdockResponseValidationError(
        "Salesdock response did not match the expected schema. " +
          "If the API changed, you can disable this check with `validateResponses: false`.",
        result.error,
        { url, method, body: parsedBody },
      );
    }
    return result.data.data as z.infer<TSchema>;
  }

  private buildHeaders(hasBody: boolean, extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${this.config.token}`,
      ...this.config.headers,
    };
    if (hasBody) headers["Content-Type"] = "application/json";
    if (this.config.userAgent) {
      headers["User-Agent"] = `salesdock-sdk/${SDK_VERSION} ${this.config.userAgent}`;
    }
    if (extra) Object.assign(headers, extra);
    return headers;
  }

  private async fetchWithTimeout(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: string | undefined,
    options?: RequestOptions,
  ): Promise<Response> {
    const timeout = options?.timeout ?? this.config.timeout;
    const controller = timeout > 0 ? new AbortController() : undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;

    if (controller && timeout > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeout);
    }

    const onExternalAbort = () => controller?.abort();
    if (options?.signal) {
      if (options.signal.aborted) controller?.abort();
      else options.signal.addEventListener("abort", onExternalAbort, { once: true });
    }

    try {
      const signal = controller?.signal ?? options?.signal;
      return await this.config.fetch(url, {
        method,
        headers,
        body,
        signal,
      });
    } catch (err) {
      if (timedOut) {
        throw new SalesdockTimeoutError(`Request timed out after ${timeout}ms`, {
          url,
          method,
          cause: err,
        });
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
      if (options?.signal) options.signal.removeEventListener("abort", onExternalAbort);
    }
  }

  private backoffDelay(attempt: number, retryAfterMs: number | undefined): number {
    if (retryAfterMs !== undefined) return retryAfterMs;
    const base = this.config.retryDelayMs * Math.pow(2, attempt);
    const jitter = base * 0.25 * Math.random();
    return Math.round(base + jitter);
  }
}

function buildQueryString(query?: QueryParams): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v === null || v === undefined) continue;
        params.append(`${key}[]`, String(v));
      }
    } else {
      params.append(key, String(value));
    }
  }
  return params.toString();
}

async function readBody(res: Response): Promise<{ parsedBody: unknown; rawText: string }> {
  let rawText = "";
  try {
    rawText = await res.text();
  } catch {
    return { parsedBody: undefined, rawText: "" };
  }
  if (!rawText) return { parsedBody: undefined, rawText };
  try {
    return { parsedBody: JSON.parse(rawText), rawText };
  } catch {
    return { parsedBody: undefined, rawText };
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

function wrapNetworkError(err: unknown, url: string, method: string): Error {
  if (err instanceof SalesdockTimeoutError) return err;
  return new SalesdockConnectionError(
    err instanceof Error ? err.message : "Network request failed",
    { url, method, cause: err },
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowMs(): number {
  return Date.now();
}
