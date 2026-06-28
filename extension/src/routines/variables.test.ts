import { describe, expect, it } from "vitest";

import {
  extractVariable,
  isReference,
  referenceName,
  removeVariable,
  resolveInputs,
  resolveStepValue,
  setVariableSecret,
  updateVariableDefault
} from "./variables.js";
import type { Routine } from "../contracts/index.js";

function routine(): Routine {
  return {
    schemaVersion: 1,
    id: "33333333-3333-4333-8333-333333333333",
    name: "Alta",
    allowedDomains: ["fixtures.local"],
    steps: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        action: "fill",
        risk: "low",
        confirmationRequired: false,
        value: "Ana"
      }
    ]
  };
}

describe("referencias", () => {
  it("detecta y nombra una referencia", () => {
    expect(isReference("{{cliente}}")).toBe(true);
    expect(isReference("Ana")).toBe(false);
    expect(referenceName("{{ cliente }}")).toBe("cliente");
  });
});

describe("extractVariable", () => {
  it("crea la variable e inserta la referencia", () => {
    const result = extractVariable(routine(), 0, "cliente");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.routine.variables).toEqual([
        { name: "cliente", type: "string", secret: false, defaultValue: "Ana" }
      ]);
      expect(result.routine.steps[0]?.value).toBe("{{cliente}}");
    }
  });

  it("rechaza un nombre inválido", () => {
    expect(extractVariable(routine(), 0, "1mal").ok).toBe(false);
  });

  it("rechaza un nombre duplicado", () => {
    const first = extractVariable(routine(), 0, "cliente");
    expect(first.ok).toBe(true);
    if (first.ok) {
      // El valor ya es referencia: convertir de nuevo falla por valor.
      expect(extractVariable(first.routine, 0, "cliente").ok).toBe(false);
    }
  });
});

describe("gestión de variables", () => {
  it("edita el valor por defecto", () => {
    const withVar = extractVariable(routine(), 0, "cliente");
    if (!withVar.ok) throw new Error("setup");
    const updated = updateVariableDefault(withVar.routine, "cliente", "Luis");
    expect(updated.variables?.[0]?.defaultValue).toBe("Luis");
  });

  it("al marcar secreta descarta el valor por defecto", () => {
    const withVar = extractVariable(routine(), 0, "cliente");
    if (!withVar.ok) throw new Error("setup");
    const secret = setVariableSecret(withVar.routine, "cliente", true);
    expect(secret.variables?.[0]?.secret).toBe(true);
    expect("defaultValue" in secret.variables![0]!).toBe(false);
  });

  it("impide eliminar una variable referenciada", () => {
    const withVar = extractVariable(routine(), 0, "cliente");
    if (!withVar.ok) throw new Error("setup");
    expect(removeVariable(withVar.routine, "cliente").ok).toBe(false);
  });
});

describe("resolución", () => {
  it("resuelve con entrada provista y cae al default", () => {
    const withVar = extractVariable(routine(), 0, "cliente");
    if (!withVar.ok) throw new Error("setup");

    const defaults = resolveInputs(withVar.routine);
    expect(defaults).toEqual({ cliente: "Ana" });

    const provided = resolveInputs(withVar.routine, { cliente: "Luis" });
    expect(provided).toEqual({ cliente: "Luis" });
  });

  it("sustituye la referencia del paso por el valor resuelto", () => {
    const inputs = { cliente: "Luis" };
    expect(resolveStepValue("{{cliente}}", inputs)).toEqual({ resolved: true, value: "Luis" });
    expect(resolveStepValue("texto fijo", inputs)).toEqual({ resolved: true, value: "texto fijo" });
    expect(resolveStepValue("{{otra}}", inputs)).toEqual({ resolved: false, name: "otra" });
  });

  it("no incluye variables secretas en los inputs no confidenciales", () => {
    const withVar = extractVariable(routine(), 0, "cliente");
    if (!withVar.ok) throw new Error("setup");
    const secret = setVariableSecret(withVar.routine, "cliente", true);
    expect(resolveInputs(secret)).toEqual({});
  });
});
