import { describe, expect, it } from "vitest";

import {
  createExecution,
  isExecutableAction,
  isTerminal,
  needsConfirmation,
  reduce,
  type ExecutionState
} from "./execution.js";
import type { Routine, Step } from "../contracts/index.js";

let counter = 0;
function step(overrides: Partial<Step> = {}): Step {
  counter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
    action: "click",
    risk: "low",
    confirmationRequired: false,
    ...overrides
  };
}

function routine(steps: Step[]): Routine {
  return {
    schemaVersion: 1,
    id: "33333333-3333-4333-8333-333333333333",
    name: "R",
    allowedDomains: ["fixtures.local"],
    steps
  };
}

function run(r: Routine, events: Parameters<typeof reduce>[2][]): ExecutionState {
  return events.reduce((state, event) => reduce(r, state, event), createExecution());
}

describe("inicio", () => {
  it("una rutina vacía termina al iniciar", () => {
    const state = run(routine([]), [{ type: "start" }]);
    expect(state.status).toBe("completed");
  });

  it("una rutina de pasos de bajo riesgo se ejecuta hasta completarse", () => {
    const r = routine([step(), step()]);
    const state = run(r, [{ type: "start" }, { type: "stepCompleted" }, { type: "stepCompleted" }]);
    expect(state.status).toBe("completed");
    expect(state.results.map((res) => res.status)).toEqual(["success", "success"]);
  });
});

describe("confirmación", () => {
  it("se detiene antes de un paso con confirmación y avanza al confirmar", () => {
    const r = routine([step({ confirmationRequired: true }), step()]);
    let state = run(r, [{ type: "start" }]);
    expect(state.status).toBe("waiting_for_confirmation");

    state = reduce(r, state, { type: "confirm" });
    expect(state.status).toBe("running");

    state = reduce(r, state, { type: "stepCompleted" });
    // Queda un segundo paso de bajo riesgo: sigue en marcha.
    expect(state.status).toBe("running");
    expect(state.index).toBe(1);

    state = reduce(r, state, { type: "stepCompleted" });
    expect(state.status).toBe("completed");
  });

  it("un paso irreversible exige confirmación aunque el flag sea falso", () => {
    expect(needsConfirmation(step({ risk: "irreversible", confirmationRequired: false }))).toBe(
      true
    );
    const r = routine([step({ risk: "irreversible", confirmationRequired: false })]);
    expect(run(r, [{ type: "start" }]).status).toBe("waiting_for_confirmation");
  });
});

describe("fallo y cancelación", () => {
  it("un paso fallido lleva a failed y registra el error", () => {
    const r = routine([step()]);
    const state = run(r, [{ type: "start" }, { type: "stepFailed", error: "no encontrado" }]);
    expect(state.status).toBe("failed");
    expect(state.results[0]?.error).toBe("no encontrado");
  });

  it("cancel desde un estado no terminal lleva a cancelled y es estable", () => {
    const r = routine([step(), step()]);
    const cancelled = run(r, [{ type: "start" }, { type: "cancel" }]);
    expect(cancelled.status).toBe("cancelled");
    // Terminal estable: más eventos no cambian el estado.
    expect(reduce(r, cancelled, { type: "stepCompleted" })).toBe(cancelled);
  });
});

describe("pausa y reanudación", () => {
  it("pausa desde running y reanuda al mismo paso", () => {
    const r = routine([step(), step()]);
    let state = run(r, [{ type: "start" }]);
    state = reduce(r, state, { type: "pause" });
    expect(state.status).toBe("paused");
    state = reduce(r, state, { type: "resume" });
    expect(state.status).toBe("running");
    expect(state.index).toBe(0);
  });
});

describe("utilidades", () => {
  it("isTerminal reconoce los estados finales", () => {
    expect(isTerminal("completed")).toBe(true);
    expect(isTerminal("running")).toBe(false);
  });

  it("isExecutableAction respeta el catálogo cerrado", () => {
    expect(isExecutableAction("click")).toBe(true);
    expect(isExecutableAction("ask_user")).toBe(false);
    expect(isExecutableAction("download")).toBe(false);
  });
});
