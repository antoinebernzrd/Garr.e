import { describe, expect, it } from "vitest";
import { renderErrorPage } from "./error-page";

describe("renderErrorPage", () => {
  it("returns a complete standalone HTML document", () => {
    const html = renderErrorPage();
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>");
    expect(html).toContain("</html>");
  });
});
