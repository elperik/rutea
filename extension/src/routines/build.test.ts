import { describe, expect, it } from "vitest";

import { buildRoutineFromRecording, type RecordedStepInput } from "./build.js";

const ROUTINE_ID = "33333333-3333-4333-8333-333333333333";
const S1 = "11111111-1111-4111-8111-111111111111";
const S2 = "22222222-2222-4222-8222-222222222222";

function recording(): RecordedStepInput[] {
  return [
    {
      id: S1,
      action: "click",
      url: "https://fixtures.local/alta",
      target: { selectors: ["#guardar"], accessibleName: "Guardar" }
    },
    {
      id: S2,
      action: "fill",
      url: "https://fixtures.local/alta",
      target: { selectors: ['input[name="nombre"]'], name: "nombre" },
      value: "Ana"
    }
  ];
}

describe("buildRoutineFromRecording", () => {
  it("produce una rutina válida a partir de la grabación", () => {
    const result = buildRoutineFromRecording("Alta de prueba", recording(), { id: ROUTINE_ID });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.routine.id).toBe(ROUTINE_ID);
      expect(result.routine.allowedDomains).toEqual(["fixtures.local"]);
      expect(result.routine.steps).toHaveLength(2);
      expect(result.routine.steps[0]?.risk).toBe("low");
      expect(result.routine.steps[0]?.confirmationRequired).toBe(false);
    }
  });

  it("deriva dominios únicos de los pasos", () => {
    const steps = recording();
    steps.push({ id: ROUTINE_ID, action: "click", url: "https://otra.local/x" });
    const result = buildRoutineFromRecording("Mixta", steps, { id: ROUTINE_ID });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.routine.allowedDomains.sort()).toEqual(["fixtures.local", "otra.local"]);
    }
  });

  it("rechaza una grabación vacía", () => {
    const result = buildRoutineFromRecording("Vacía", [], { id: ROUTINE_ID });
    expect(result.ok).toBe(false);
  });

  it("rechaza un nombre vacío", () => {
    const result = buildRoutineFromRecording("   ", recording(), { id: ROUTINE_ID });
    expect(result.ok).toBe(false);
  });

  it("omite valores redactados (null) en lugar de exportarlos", () => {
    const steps: RecordedStepInput[] = [
      {
        id: S1,
        action: "fill",
        url: "https://fixtures.local/login",
        target: { selectors: ["#password"], name: "password" },
        value: null
      }
    ];
    const result = buildRoutineFromRecording("Login", steps, { id: ROUTINE_ID });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect("value" in result.routine.steps[0]!).toBe(false);
    }
  });
});
