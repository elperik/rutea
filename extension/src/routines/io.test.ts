import { describe, expect, it } from "vitest";

import { parseRoutine, serializeRoutine } from "./io.js";
import type { Routine } from "../contracts/index.js";

const routine: Routine = {
  schemaVersion: 1,
  id: "33333333-3333-4333-8333-333333333333",
  name: "Rutina de prueba",
  allowedDomains: ["fixtures.local"],
  steps: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      action: "click",
      risk: "low",
      confirmationRequired: false
    }
  ]
};

describe("serializeRoutine / parseRoutine", () => {
  it("hace round-trip de una rutina válida", () => {
    const result = parseRoutine(serializeRoutine(routine));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.routine).toEqual(routine);
    }
  });

  it("rechaza JSON inválido", () => {
    expect(parseRoutine("{ no es json").ok).toBe(false);
  });

  it("rechaza una rutina con campos desconocidos (manipulada)", () => {
    const tampered = { ...routine, inesperado: true };
    expect(parseRoutine(JSON.stringify(tampered)).ok).toBe(false);
  });

  it("rechaza una rutina que no cumple el esquema", () => {
    const invalid = { ...routine, allowedDomains: [] };
    expect(parseRoutine(JSON.stringify(invalid)).ok).toBe(false);
  });
});
