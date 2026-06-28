import { describe, expect, it } from "vitest";

import { parseRoutineDocument, serializeRoutineExport } from "./io.js";
import { buildExport } from "./version.js";
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

describe("serializeRoutineExport / parseRoutineDocument", () => {
  it("exporta un sobre con integridad e importa verificando el hash", async () => {
    const text = await serializeRoutineExport(routine);
    const result = await parseRoutineDocument(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.verified).toBe(true);
      expect(result.routine).toEqual(routine);
    }
  });

  it("rechaza un sobre cuya rutina ha sido manipulada", async () => {
    const envelope = await buildExport(routine);
    const tampered = {
      ...envelope,
      routine: { ...envelope.routine, name: "Nombre alterado" }
    };
    const result = await parseRoutineDocument(JSON.stringify(tampered));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues[0]?.message).toMatch(/integridad|manipulada/i);
    }
  });

  it("acepta una rutina en crudo marcándola como no verificada", async () => {
    const result = await parseRoutineDocument(JSON.stringify(routine));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.verified).toBe(false);
    }
  });

  it("rechaza JSON inválido", async () => {
    expect((await parseRoutineDocument("{ roto")).ok).toBe(false);
  });

  it("rechaza una rutina cruda con campos desconocidos", async () => {
    const tampered = { ...routine, inesperado: true };
    expect((await parseRoutineDocument(JSON.stringify(tampered))).ok).toBe(false);
  });
});
