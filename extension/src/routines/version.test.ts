import { describe, expect, it } from "vitest";

import { buildExport, canonicalRoutine, hashRoutine, verifyExport } from "./version.js";
import type { Routine } from "../contracts/index.js";

const routine: Routine = {
  schemaVersion: 1,
  id: "33333333-3333-4333-8333-333333333333",
  name: "Rutina",
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

describe("canonicalRoutine", () => {
  it("es estable ante distinto orden de claves", () => {
    const reordered = {
      steps: routine.steps,
      allowedDomains: routine.allowedDomains,
      name: routine.name,
      id: routine.id,
      schemaVersion: routine.schemaVersion
    } as Routine;
    expect(canonicalRoutine(reordered)).toBe(canonicalRoutine(routine));
  });
});

describe("hashRoutine", () => {
  it("produce un hash hex de 64 caracteres", async () => {
    expect(await hashRoutine(routine)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("cambia si cambia el contenido", async () => {
    const other: Routine = { ...routine, name: "Otra" };
    expect(await hashRoutine(routine)).not.toBe(await hashRoutine(other));
  });
});

describe("buildExport / verifyExport", () => {
  it("hace round-trip verificable", async () => {
    const envelope = await buildExport(routine);
    expect(envelope.integrity.algorithm).toBe("SHA-256");
    expect(await verifyExport(envelope)).toBe(true);
  });

  it("falla la verificación si se altera la rutina del sobre", async () => {
    const envelope = await buildExport(routine);
    const tampered = { ...envelope, routine: { ...envelope.routine, name: "X" } };
    expect(await verifyExport(tampered)).toBe(false);
  });
});
