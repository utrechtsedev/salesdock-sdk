import { Salesdock, type SalesdockConfig } from "../src/index.js";

export interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export type FetchHandler = (
  url: string,
  init: RequestInit | undefined,
  callIndex: number,
) => Response | Promise<Response>;

/** Build a Salesdock client backed by a recording mock fetch. */
export function makeClient(
  handler: FetchHandler,
  config: Partial<SalesdockConfig> = {},
): { sd: Salesdock; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetchImpl = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({
      url,
      method: init?.method ?? "GET",
      headers: (init?.headers as Record<string, string>) ?? {},
      body: typeof init?.body === "string" ? init.body : undefined,
    });
    return handler(url, init, calls.length);
  };
  const sd = new Salesdock({
    domain: "demo",
    token: "tok",
    fetch: fetchImpl,
    retryDelayMs: 0,
    ...config,
  });
  return { sd, calls };
}

/** Build a JSON `Response` with the Salesdock envelope content type. */
export function jsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** Build a successful envelope payload. */
export function envelope(data: unknown, message = "ok"): Record<string, unknown> {
  return { success: true, data, message };
}
