import { describe, expect, it } from "vitest";

import { moveStep, removeStep, renameRoutine, updateStep } from "./edit.js";
import type { Routine, Step } from "../contracts/index.js";

function step(id: string): Step {
  return { id, action: "click", risk: "low", confirmationRequired: false };
}

function routine(): Routine {
  return {
    schemaVersion: 1,
    id: "33333333-3333-4333-8333-333333333333",
    name: "Rutina",
    allowedDomains: ["fixtures.local"],
    steps: [
      step("11111111-1111-4111-8111-111111111111"),
      step("22222222-2222-4222-8222-222222222222"),
      step("44444444-4444-4444-8444-444444444444")
    ]
  };
}

describe("renameRoutine", () => {
  it("cambia el nombre y recorta espacios", () => {
    expect(renameRoutine(routine(), "  Nueva  ").name).toBe("Nueva");
  });

  it("no muta la entrada", () => {
    const original = routine();
    renameRoutine(original, "X");
    expect(original.name).toBe("Rutina");
  });
});

describe("removeStep", () => {
  it("elimina el paso indicado", () => {
    const result = removeStep(routine(), 1);
    expect(result.steps.map((s) => s.id)).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "44444444-4444-4444-8444-444444444444"
    ]);
  });

  it("ignora un índice fuera de rango", () => {
    expect(removeStep(routine(), 9).steps).toHaveLength(3);
  });
});

describe("moveStep", () => {
  it("baja un paso", () => {
    const result = moveStep(routine(), 0, 1);
    expect(result.steps[0]?.id).toBe("22222222-2222-4222-8222-222222222222");
    expect(result.steps[1]?.id).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("sube un paso", () => {
    const result = moveStep(routine(), 2, -1);
    expect(result.steps[1]?.id).toBe("44444444-4444-4444-8444-444444444444");
  });

  it("no hace nada si el destino se sale de rango", () => {
    const result = moveStep(routine(), 0, -1);
    expect(result.steps[0]?.id).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("no muta la entrada", () => {
    const original = routine();
    moveStep(original, 0, 1);
    expect(original.steps[0]?.id).toBe("11111111-1111-4111-8111-111111111111");
  });
});

describe("updateStep", () => {
  it("aplica un patch parcial sin tocar otros campos", () => {
    const result = updateStep(routine(), 0, { risk: "high", confirmationRequired: true });
    expect(result.steps[0]?.risk).toBe("high");
    expect(result.steps[0]?.confirmationRequired).toBe(true);
    expect(result.steps[0]?.action).toBe("click");
    expect(result.steps[1]?.risk).toBe("low");
  });

  it("establece y limpia el timeout", () => {
    const withTimeout = updateStep(routine(), 0, { timeoutMs: 5000 });
    expect(withTimeout.steps[0]?.timeoutMs).toBe(5000);
    const cleared = updateStep(withTimeout, 0, { timeoutMs: undefined });
    expect("timeoutMs" in cleared.steps[0]!).toBe(false);
  });

  it("edita campos assist y elimina opcionales vaciados", () => {
    const base = updateStep(routine(), 0, {
      action: "assist",
      strategy: "auto",
      observationMode: "semantic-first",
      instruction: "Buscar pendientes",
      allowedActions: ["click", "assert"],
      maxModelTurns: 5,
      maxActions: 20,
      maxIterations: 2,
      maxInputBytes: 65_536,
      maxScreenshotCount: 0,
      maxDurationMs: 60_000,
      stopCondition: "No quedan pendientes"
    });

    const edited = updateStep(base, 0, {
      instruction: "Firmar pendientes",
      maxIterations: 1,
      stopCondition: undefined
    });

    expect(edited.steps[0]?.instruction).toBe("Firmar pendientes");
    expect(edited.steps[0]?.maxIterations).toBe(1);
    expect("stopCondition" in edited.steps[0]!).toBe(false);
  });
});
