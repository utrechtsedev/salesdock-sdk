import type { z } from "zod";
import type { ResolvedConfig, Scope } from "../core/config.js";
import type { HttpClient } from "../core/http.js";
import { SalesdockInvalidRequestError } from "../core/errors.js";
import type { RequestOptions } from "../core/types.js";

/**
 * Base class shared by every resource group. Holds the transport and resolved
 * config, and provides input-validation + scope helpers.
 */
export abstract class BaseResource {
  constructor(
    protected readonly http: HttpClient,
    protected readonly config: ResolvedConfig,
  ) {}

  /** Resolve the scope segment for a call (per-call override beats config). */
  protected scope(options?: RequestOptions): Scope {
    return options?.scope ?? this.config.scope;
  }

  /**
   * Validate request input against a Zod schema when request validation is
   * enabled, returning the parsed value. Throws
   * {@link SalesdockInvalidRequestError} on failure (before any network call).
   */
  protected parseInput<TSchema extends z.ZodTypeAny>(
    schema: TSchema,
    value: unknown,
    label: string,
  ): z.infer<TSchema> {
    if (!this.config.validateRequests) return value as z.infer<TSchema>;
    const result = schema.safeParse(value);
    if (!result.success) {
      throw new SalesdockInvalidRequestError(
        `Invalid input for ${label}: ${summarize(result.error)}`,
        result.error,
      );
    }
    return result.data;
  }
}

function summarize(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}
