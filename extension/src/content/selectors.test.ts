import { describe, expect, it } from "vitest";

import { rankSelectors, escapeIdent, type ElementSignals } from "./selectors.js";

describe("rankSelectors", () => {
  it("prioriza id sobre data-testid, name y estructural", () => {
    const signals: ElementSignals = {
      tag: "input",
      id: "correo",
      testId: "campo-correo",
      name: "email",
      structural: "form > input:nth-of-type(2)"
    };

    const ranked = rankSelectors(signals);

    expect(ranked.map((entry) => entry.selector)).toEqual([
      "#correo",
      '[data-testid="campo-correo"]',
      'input[name="email"]',
      "form > input:nth-of-type(2)"
    ]);
    expect(ranked[0]?.quality).toBe("high");
    expect(ranked[3]?.quality).toBe("low");
  });

  it("adjunta una explicación a cada selector", () => {
    const ranked = rankSelectors({ tag: "button", id: "guardar" });
    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.rationale).toMatch(/identificador/i);
  });

  it("es determinista para las mismas señales", () => {
    const signals: ElementSignals = { tag: "a", name: "siguiente" };
    expect(rankSelectors(signals)).toEqual(rankSelectors(signals));
  });

  it("no produce selectores cuando no hay señales útiles", () => {
    expect(rankSelectors({ tag: "div" })).toEqual([]);
  });
});

describe("escapeIdent", () => {
  it("deja intactos los identificadores seguros", () => {
    expect(escapeIdent("correo-1")).toBe("correo-1");
  });

  it("escapa caracteres especiales", () => {
    expect(escapeIdent("a.b")).toBe("a\\.b");
  });

  it("escapa un dígito inicial", () => {
    expect(escapeIdent("1abc")).toBe("\\31 abc");
  });
});
