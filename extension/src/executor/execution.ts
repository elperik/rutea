// Máquina de estados de ejecución de una rutina. Lógica pura, sin DOM ni
// temporizadores: un reductor de eventos sobre un estado inmutable. El player
// que actúe en el DOM emitirá los eventos y consultará el paso actual.

import type { Routine, Step } from "../contracts/index.js";

export type ExecutionStatus =
  | "created"
  | "running"
  | "waiting_for_confirmation"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

export type ExecutionMode = "step" | "supervised";

export interface StepOutcome {
  stepId: string;
  status: "success" | "failed";
  selectorUsed?: string;
  error?: string;
}

export interface ExecutionState {
  status: ExecutionStatus;
  /** Índice del paso actual o siguiente a ejecutar. */
  index: number;
  results: StepOutcome[];
  mode: ExecutionMode;
}

export type ExecutionEvent =
  | { type: "start" }
  | { type: "confirm" }
  | { type: "stepCompleted"; selectorUsed?: string }
  | { type: "stepFailed"; error: string; selectorUsed?: string }
  | { type: "cancel" }
  | { type: "pause" }
  | { type: "resume" };

/** Catálogo cerrado de acciones que el ejecutor puede realizar. */
export const EXECUTABLE_ACTIONS = [
  "navigate",
  "click",
  "fill",
  "select",
  "check",
  "wait",
  "assert"
] as const;

export type ExecutableAction = (typeof EXECUTABLE_ACTIONS)[number];

export function isExecutableAction(action: string): action is ExecutableAction {
  return (EXECUTABLE_ACTIONS as readonly string[]).includes(action);
}

const TERMINAL: ReadonlySet<ExecutionStatus> = new Set(["completed", "failed", "cancelled"]);

export function isTerminal(status: ExecutionStatus): boolean {
  return TERMINAL.has(status);
}

export function createExecution(mode: ExecutionMode = "supervised"): ExecutionState {
  return { status: "created", index: 0, results: [], mode };
}

export function currentStep(routine: Routine, state: ExecutionState): Step | undefined {
  return routine.steps[state.index];
}

/** Un paso exige confirmación por su flag o por riesgo alto/irreversible. */
export function needsConfirmation(step: Step): boolean {
  return step.confirmationRequired === true || step.risk === "high" || step.risk === "irreversible";
}

export function reduce(
  routine: Routine,
  state: ExecutionState,
  event: ExecutionEvent
): ExecutionState {
  if (isTerminal(state.status)) {
    return state;
  }

  switch (event.type) {
    case "cancel":
      return { ...state, status: "cancelled" };

    case "pause":
      return state.status === "running" || state.status === "waiting_for_confirmation"
        ? { ...state, status: "paused" }
        : state;

    case "resume":
      return state.status === "paused" ? enter(routine, state, state.index) : state;

    case "start":
      return state.status === "created" ? enter(routine, state, 0) : state;

    case "confirm":
      return state.status === "waiting_for_confirmation" ? { ...state, status: "running" } : state;

    case "stepCompleted":
      return recordCompletion(routine, state, event.selectorUsed);

    case "stepFailed":
      return recordFailure(routine, state, event.error, event.selectorUsed);

    default:
      return state;
  }
}

function recordCompletion(
  routine: Routine,
  state: ExecutionState,
  selectorUsed: string | undefined
): ExecutionState {
  if (state.status !== "running") {
    return state;
  }
  const step = currentStep(routine, state);
  if (!step) {
    return state;
  }
  const results = [...state.results, outcome(step.id, "success", { selectorUsed })];
  return enter(routine, { ...state, results }, state.index + 1);
}

function recordFailure(
  routine: Routine,
  state: ExecutionState,
  error: string,
  selectorUsed: string | undefined
): ExecutionState {
  if (state.status !== "running") {
    return state;
  }
  const step = currentStep(routine, state);
  if (!step) {
    return state;
  }
  const results = [...state.results, outcome(step.id, "failed", { selectorUsed, error })];
  return { ...state, results, status: "failed" };
}

// Posiciona el estado en `index`, decidiendo el estado de entrada del paso.
function enter(routine: Routine, state: ExecutionState, index: number): ExecutionState {
  if (index >= routine.steps.length) {
    return { ...state, index, status: "completed" };
  }
  const step = routine.steps[index];
  if (step && needsConfirmation(step)) {
    return { ...state, index, status: "waiting_for_confirmation" };
  }
  return { ...state, index, status: "running" };
}

function outcome(
  stepId: string,
  status: StepOutcome["status"],
  extra: { selectorUsed?: string; error?: string }
): StepOutcome {
  const result: StepOutcome = { stepId, status };
  if (extra.selectorUsed !== undefined) {
    result.selectorUsed = extra.selectorUsed;
  }
  if (extra.error !== undefined) {
    result.error = extra.error;
  }
  return result;
}
