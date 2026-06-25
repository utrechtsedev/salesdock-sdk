import { describe, it, expect } from "vitest";
import { OffsetPage, CursorPage } from "../src/index.js";
import { makeClient, jsonResponse, envelope } from "./helpers.js";

function offsetPage(page: number, lastPage: number, items: unknown[]) {
  const base = "https://app.salesdock.nl/api/demo/v1/user/relations";
  return envelope({
    current_page: page,
    data: items,
    first_page_url: `${base}?page=1`,
    from: 1,
    last_page: lastPage,
    last_page_url: `${base}?page=${lastPage}`,
    next_page_url: page < lastPage ? `${base}?page=${page + 1}` : null,
    path: base,
    per_page: 2,
    prev_page_url: page > 1 ? `${base}?page=${page - 1}` : null,
    to: 2,
    total: lastPage * 2,
  });
}

describe("offset pagination", () => {
  it("returns an OffsetPage with items and meta", async () => {
    const { sd } = makeClient(() => jsonResponse(offsetPage(1, 3, [{ id: 1 }, { id: 2 }])));
    const page = await sd.relations.list();
    expect(page).toBeInstanceOf(OffsetPage);
    expect(page.items.map((r) => r.id)).toEqual([1, 2]);
    expect(page.total).toBe(6);
    expect(page.hasNextPage).toBe(true);
  });

  it("follows next_page_url and iterates all items across pages", async () => {
    const pages: Record<string, unknown> = {
      "page=1": offsetPage(1, 3, [{ id: 1 }, { id: 2 }]),
      "page=2": offsetPage(2, 3, [{ id: 3 }, { id: 4 }]),
      "page=3": offsetPage(3, 3, [{ id: 5 }, { id: 6 }]),
    };
    const { sd, calls } = makeClient((url) => {
      const key = url.includes("page=")
        ? `page=${new URL(url).searchParams.get("page")}`
        : "page=1";
      return jsonResponse(pages[key]);
    });
    const first = await sd.relations.list();
    const all: unknown[] = [];
    for await (const r of first) all.push(r.id);
    expect(all).toEqual([1, 2, 3, 4, 5, 6]);
    // .all() should produce the same across a fresh page chain
    const again = await (await sd.relations.list()).all();
    expect(again.map((r) => r.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(calls.length).toBeGreaterThanOrEqual(6);
  });

  it("steps forward with nextPage()", async () => {
    const pages: Record<string, unknown> = {
      "page=1": offsetPage(1, 2, [{ id: 1 }]),
      "page=2": offsetPage(2, 2, [{ id: 2 }]),
    };
    const { sd } = makeClient((url) => {
      const p = url.includes("page=2") ? "page=2" : "page=1";
      return jsonResponse(pages[p]);
    });
    const page1 = await sd.relations.list();
    const page2 = await page1.nextPage();
    expect(page2?.items[0]!.id).toBe(2);
    expect(await page2!.nextPage()).toBeNull();
  });
});

describe("cursor pagination", () => {
  function cursorPage(cursor: string | null, next: string | null, items: unknown[]) {
    const base = "https://app.salesdock.nl/api/demo/v1/user/tasks";
    return envelope({
      path: base,
      per_page: 2,
      next_cursor: next,
      next_page_url: next ? `${base}?cursor=${next}` : null,
      prev_cursor: cursor,
      prev_page_url: cursor ? `${base}?cursor=${cursor}` : null,
      data: items,
    });
  }

  it("returns a CursorPage and walks forward", async () => {
    const { sd } = makeClient((url) => {
      if (url.includes("cursor=c2")) return jsonResponse(cursorPage("c1", null, [{ id: 3 }]));
      return jsonResponse(cursorPage(null, "c2", [{ id: 1 }, { id: 2 }]));
    });
    const page = await sd.tasks.list();
    expect(page).toBeInstanceOf(CursorPage);
    expect(page.hasNextPage).toBe(true);
    const collected: unknown[] = [];
    for await (const t of page) collected.push((t as { id: number }).id);
    expect(collected).toEqual([1, 2, 3]);
  });
});
