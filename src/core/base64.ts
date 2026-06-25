/**
 * Decode a base64 string to a `Uint8Array`, using only Web-standard primitives
 * so it runs identically on Cloudflare Workers, Deno, Bun, browsers and Node 18+.
 *
 * Accepts both standard and URL-safe base64 (`-`/`_`), tolerates surrounding
 * whitespace/newlines, and re-pads as needed.
 *
 * Several Salesdock endpoints return file contents (PDFs) as base64 strings,
 * e.g. the `content` field of {@link SalesClient.getContract} or the lead/form
 * PDF endpoints. Use this to turn that string into raw bytes you can store or
 * serve. Those fields are nullable, so guard before decoding.
 *
 * @example
 * ```ts
 * const { contract } = await sd.sales.getContract(saleId);
 * if (contract?.content) {
 *   const bytes = decodeBase64(contract.content);
 *   return new Response(bytes, { headers: { "content-type": "application/pdf" } });
 * }
 * ```
 */
export function decodeBase64(base64: string): Uint8Array {
  // Strip whitespace and translate URL-safe alphabet to the standard one.
  let normalized = base64.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  // Restore padding that URL-safe / unpadded encoders may have dropped.
  const remainder = normalized.length % 4;
  if (remainder === 2) normalized += "==";
  else if (remainder === 3) normalized += "=";
  const binary = atob(normalized);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
