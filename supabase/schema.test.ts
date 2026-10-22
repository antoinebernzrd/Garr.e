import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("./bootstrap_full_schema.sql", import.meta.url), "utf8");

const tables = [...sql.matchAll(/create table (?:if not exists )?(?:public\.)?(\w+)/gi)].map((m) => m[1]);
const rlsTables = new Set(
  [...sql.matchAll(/alter table (?:only )?(?:public\.)?(\w+)\s+enable row level security/gi)].map((m) => m[1]),
);

describe("bootstrap schema", () => {
  it("defines the expected tables", () => {
    expect(tables.sort()).toEqual(
      ["friend_assignments", "friendships", "next_up_items", "profiles", "updates", "user_groups", "waves"],
    );
  });

  it("enables row-level security on every table", () => {
    const missing = tables.filter((t) => !rlsTables.has(t));
    expect(missing).toEqual([]);
  });

  it("defines at least one policy per table", () => {
    for (const t of tables) {
      expect(sql, `no policy on ${t}`).toMatch(new RegExp(`create policy[^;]*on (?:public\\.)?${t}\\b`, "i"));
    }
  });
});
