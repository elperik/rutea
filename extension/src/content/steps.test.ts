import { describe, expect, it } from "vitest";

import { appendStep, isEquivalent, type RecordedStepLike } from "./steps.js";

const base: RecordedStepLike = {
  action: "click",
  url: "https://fixtures.local/",
  primarySelector: "#guardar",
  value: undefined
};

describe("isEquivalent", () => {
  it("detecta pasos idénticos", () => {
    expect(isEquivalent(base, { ...base })).toBe(true);
  });

  it("distingue por valor", () => {
    expect(
      isEquivalent({ ...base, action: "fill", value: "a" }, { ...base, action: "fill", value: "b" })
    ).toBe(false);
  });
});

describe("appendStep", () => {
  it("no añade un clic equivalente consecutivo", () => {
    const steps = appendStep([base], { ...base });
    expect(steps).toHaveLength(1);
  });

  it("añade un clic en un objetivo distinto", () => {
    const steps = appendStep([base], { ...base, primarySelector: "#cancelar" });
    expect(steps).toHaveLength(2);
  });

  it("colapsa escrituras sucesivas en el mismo campo conservando el último valor", () => {
    const fillA: RecordedStepLike = {
      action: "fill",
      url: "https://fixtures.local/",
      primarySelector: "#nombre",
      value: "Ana"
    };
    const fillB: RecordedStepLike = { ...fillA, value: "Ana María" };

    const afterFirst = appendStep([], fillA);
    const afterSecond = appendStep(afterFirst, fillB);

    expect(afterSecond).toHaveLength(1);
    expect(afterSecond[0]?.value).toBe("Ana María");
  });

  it("no muta la lista de entrada", () => {
    const input = [base];
    appendStep(input, { ...base, primarySelector: "#otro" });
    expect(input).toHaveLength(1);
  });
});
