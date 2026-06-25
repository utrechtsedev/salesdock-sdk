import type { z } from "zod";
import type { HttpClient } from "./http.js";
import type { CursorPaginated, OffsetPaginated, QueryParams, RequestOptions } from "./types.js";
import { cursorPaginatedSchema, offsetPaginatedSchema } from "../schemas/common.js";

type Loader<TMeta> = (absoluteUrl: string) => Promise<TMeta>;

/**
 * A single page of an offset-paginated (page-number) result set.
 *
 * Iterate the items of *all* pages with `for await (const item of page)`, or
 * step manually with {@link nextPage}/{@link prevPage}.
 */
export class OffsetPage<T> {
  /** Items on this page. */
  readonly items: T[];
  /** The full paginator payload as returned by the API. */
  readonly meta: OffsetPaginated<T>;

  constructor(
    meta: OffsetPaginated<T>,
    private readonly loader: Loader<OffsetPaginated<T>>,
  ) {
    this.meta = meta;
    this.items = meta.data ?? [];
  }

  get currentPage(): number {
    return this.meta.current_page;
  }
  get lastPage(): number {
    return this.meta.last_page;
  }
  get perPage(): number {
    const n = Number(this.meta.per_page);
    return Number.isFinite(n) ? n : 0;
  }
  get total(): number {
    return this.meta.total;
  }
  get hasNextPage(): boolean {
    return Boolean(this.meta.next_page_url);
  }
  get hasPrevPage(): boolean {
    return Boolean(this.meta.prev_page_url);
  }

  /** Fetch the next page, or `null` if there is none. */
  async nextPage(): Promise<OffsetPage<T> | null> {
    if (!this.meta.next_page_url) return null;
    const meta = await this.loader(this.meta.next_page_url);
    return new OffsetPage(meta, this.loader);
  }

  /** Fetch the previous page, or `null` if there is none. */
  async prevPage(): Promise<OffsetPage<T> | null> {
    if (!this.meta.prev_page_url) return null;
    const meta = await this.loader(this.meta.prev_page_url);
    return new OffsetPage(meta, this.loader);
  }

  /** Collect every item across this and all following pages into one array. */
  async all(): Promise<T[]> {
    const out: T[] = [];
    for await (const item of this) out.push(item);
    return out;
  }

  /** Async-iterate items across this and all subsequent pages. */
  async *[Symbol.asyncIterator](): AsyncGenerator<T, void, void> {
    let page: OffsetPage<T> | null = this;
    while (page) {
      for (const item of page.items) yield item;
      page = await page.nextPage();
    }
  }
}

/**
 * A single page of a cursor-paginated result set. Cursor pagination does not
 * report a total count; traverse with {@link nextPage}/{@link prevPage} or
 * iterate forward across all pages.
 */
export class CursorPage<T> {
  /** Items on this page. */
  readonly items: T[];
  /** The full cursor-paginator payload as returned by the API. */
  readonly meta: CursorPaginated<T>;

  constructor(
    meta: CursorPaginated<T>,
    private readonly loader: Loader<CursorPaginated<T>>,
  ) {
    this.meta = meta;
    this.items = meta.data ?? [];
  }

  get perPage(): number {
    const n = Number(this.meta.per_page);
    return Number.isFinite(n) ? n : 0;
  }
  get nextCursor(): string | null {
    return this.meta.next_cursor ?? null;
  }
  get prevCursor(): string | null {
    return this.meta.prev_cursor ?? null;
  }
  get hasNextPage(): boolean {
    return Boolean(this.meta.next_page_url);
  }
  get hasPrevPage(): boolean {
    return Boolean(this.meta.prev_page_url);
  }

  /** Fetch the next page, or `null` if there is none. */
  async nextPage(): Promise<CursorPage<T> | null> {
    if (!this.meta.next_page_url) return null;
    const meta = await this.loader(this.meta.next_page_url);
    return new CursorPage(meta, this.loader);
  }

  /** Fetch the previous page, or `null` if there is none. */
  async prevPage(): Promise<CursorPage<T> | null> {
    if (!this.meta.prev_page_url) return null;
    const meta = await this.loader(this.meta.prev_page_url);
    return new CursorPage(meta, this.loader);
  }

  /** Collect every item across this and all following pages into one array. */
  async all(): Promise<T[]> {
    const out: T[] = [];
    for await (const item of this) out.push(item);
    return out;
  }

  /** Async-iterate items across this and all subsequent pages. */
  async *[Symbol.asyncIterator](): AsyncGenerator<T, void, void> {
    let page: CursorPage<T> | null = this;
    while (page) {
      for (const item of page.items) yield item;
      page = await page.nextPage();
    }
  }
}

/** Issue an offset-paginated GET and wrap the result in an {@link OffsetPage}. */
export async function fetchOffsetPage<TItem extends z.ZodTypeAny>(
  http: HttpClient,
  itemSchema: TItem,
  segments: Array<string | number>,
  query: QueryParams | undefined,
  options: RequestOptions | undefined,
): Promise<OffsetPage<z.infer<TItem>>> {
  const schema = offsetPaginatedSchema(itemSchema);
  const loader: Loader<OffsetPaginated<z.infer<TItem>>> = (url) =>
    http.request({
      method: "GET",
      segments,
      dataSchema: schema,
      query: mergePageQuery(query, url),
      options,
    }) as Promise<OffsetPaginated<z.infer<TItem>>>;
  const meta = (await http.request({
    method: "GET",
    segments,
    dataSchema: schema,
    query,
    options,
  })) as OffsetPaginated<z.infer<TItem>>;
  return new OffsetPage(meta, loader);
}

/** Issue a cursor-paginated GET and wrap the result in a {@link CursorPage}. */
export async function fetchCursorPage<TItem extends z.ZodTypeAny>(
  http: HttpClient,
  itemSchema: TItem,
  segments: Array<string | number>,
  query: QueryParams | undefined,
  options: RequestOptions | undefined,
): Promise<CursorPage<z.infer<TItem>>> {
  const schema = cursorPaginatedSchema(itemSchema);
  const loader: Loader<CursorPaginated<z.infer<TItem>>> = (url) =>
    http.request({
      method: "GET",
      segments,
      dataSchema: schema,
      query: mergePageQuery(query, url),
      options,
    }) as Promise<CursorPaginated<z.infer<TItem>>>;
  const meta = (await http.request({
    method: "GET",
    segments,
    dataSchema: schema,
    query,
    options,
  })) as CursorPaginated<z.infer<TItem>>;
  return new CursorPage(meta, loader);
}

/**
 * Build the query for the next/prev page by taking the server-reported page URL
 * (`next_page_url`/`prev_page_url`) and applying *only its query parameters* on
 * top of the original request's query — against the SDK's own base URL and
 * path. This deliberately ignores the origin embedded in the page URL so that a
 * custom `baseUrl` (staging/proxy) keeps being honored across pages and the
 * bearer token is never sent to a host the SDK wasn't configured for.
 */
function mergePageQuery(original: QueryParams | undefined, pageUrl: string): QueryParams {
  const out: QueryParams = { ...(original ?? {}) };
  let search: URLSearchParams;
  try {
    search = new URL(pageUrl).searchParams;
  } catch {
    return out;
  }
  for (const rawKey of new Set(search.keys())) {
    const key = rawKey.endsWith("[]") ? rawKey.slice(0, -2) : rawKey;
    const all = search.getAll(rawKey);
    out[key] = rawKey.endsWith("[]") || all.length > 1 ? all : all[0];
  }
  return out;
}
