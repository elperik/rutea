// Operaciones de edición de una rutina como transformaciones puras e inmutables.
// No validan: el llamador revalida con `validateRoutine` antes de persistir.

import type { Routine, Step } from "../contracts/index.js";

export type StepPatch = Partial<Step>;

export function renameRoutine(routine: Routine, name: string): Routine {
  return { ...routine, name: name.trim() };
}

export function removeStep(routine: Routine, index: number): Routine {
  if (!inRange(routine, index)) {
    return routine;
  }
  return { ...routine, steps: routine.steps.filter((_, i) => i !== index) };
}

/** Mueve un paso una posición arriba (-1) o abajo (+1). */
export function moveStep(routine: Routine, index: number, direction: -1 | 1): Routine {
  const target = index + direction;
  if (!inRange(routine, index) || !inRange(routine, target)) {
    return routine;
  }
  const steps = [...routine.steps];
  const moved = steps.splice(index, 1)[0];
  if (moved === undefined) {
    return routine;
  }
  steps.splice(target, 0, moved);
  return { ...routine, steps };
}

export function updateStep(routine: Routine, index: number, patch: StepPatch): Routine {
  if (!inRange(routine, index)) {
    return routine;
  }
  const steps = routine.steps.map((step, i) => {
    if (i !== index) {
      return step;
    }
    const updated: Step = { ...step, ...patch };
    removeUndefinedOptionalFields(updated);
    return updated;
  });
  return { ...routine, steps };
}

function removeUndefinedOptionalFields(step: Step): void {
  for (const key of Object.keys(step) as (keyof Step)[]) {
    if (step[key] === undefined) {
      delete step[key];
    }
  }
}

function inRange(routine: Routine, index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < routine.steps.length;
}
