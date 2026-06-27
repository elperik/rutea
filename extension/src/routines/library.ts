// Biblioteca de rutinas en almacenamiento local de la extensión.
// Fuente de verdad provisional de la Fase 2; se trasladará al host en la Fase 4.

import type { Routine } from "../contracts/index.js";

const LIBRARY_KEY = "rutea.routines";

export async function listRoutines(): Promise<Routine[]> {
  const stored = await chrome.storage.local.get(LIBRARY_KEY);
  const value = stored[LIBRARY_KEY];
  return Array.isArray(value) ? (value as Routine[]) : [];
}

/** Inserta o reemplaza una rutina por id. */
export async function saveRoutine(routine: Routine): Promise<void> {
  const routines = await listRoutines();
  const index = routines.findIndex((candidate) => candidate.id === routine.id);
  if (index >= 0) {
    routines[index] = routine;
  } else {
    routines.push(routine);
  }
  await chrome.storage.local.set({ [LIBRARY_KEY]: routines });
}

export async function deleteRoutine(id: string): Promise<void> {
  const routines = await listRoutines();
  await chrome.storage.local.set({
    [LIBRARY_KEY]: routines.filter((routine) => routine.id !== id)
  });
}
