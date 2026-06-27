import { describe, expect, it } from "vitest";

import { contentScriptId, originMatchPattern } from "./origins.js";

describe("originMatchPattern", () => {
  it("añade /* al origen", () => {
    expect(originMatchPattern("https://intranet.gpex.es")).toBe("https://intranet.gpex.es/*");
  });

  it("funciona con puerto", () => {
    expect(originMatchPattern("http://localhost:4321")).toBe("http://localhost:4321/*");
  });
});

describe("contentScriptId", () => {
  it("produce un id válido (solo alfanuméricos y guion bajo)", () => {
    const id = contentScriptId("http://localhost:4321");
    expect(id).toMatch(/^[A-Za-z0-9_]+$/);
    expect(id.startsWith("_")).toBe(false);
  });

  it("es determinista", () => {
    expect(contentScriptId("https://a.b")).toBe(contentScriptId("https://a.b"));
  });

  it("distingue orígenes distintos", () => {
    expect(contentScriptId("https://a.b")).not.toBe(contentScriptId("https://a.c"));
  });
});
