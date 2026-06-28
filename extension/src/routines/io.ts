// Exportación e importación de rutinas con sobre de integridad. La importación
// trata el texto como no confiable: valida el esquema y verifica el hash.

import {
  validateRoutine,
  validateRoutineExport,
  type Routine,
  type ValidationIssue
} from "../contracts/index.js";
import { buildExport, verifyExport } from "./version.js";

export type ParseResult =
  { ok: true; routine: Routine; verified: boolean } | { ok: false; issues: ValidationIssue[] };

/** Serializa una rutina como sobre de exportación con hash de integridad. */
export async function serializeRoutineExport(routine: Routine): Promise<string> {
  return JSON.stringify(await buildExport(routine), null, 2);
}

/**
 * Parsea un documento importado. Acepta un sobre con integridad (verificando el
 * hash) o una rutina en crudo (aceptada pero marcada como no verificada).
 */
export async function parseRoutineDocument(text: string): Promise<ParseResult> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail("(raíz)", "El fichero no es JSON válido");
  }

  if (isEnvelope(data)) {
    const envelope = validateRoutineExport(data);
    if (!envelope.ok) {
      return { ok: false, issues: envelope.issues };
    }
    const inner = validateRoutine(envelope.value.routine);
    if (!inner.ok) {
      return { ok: false, issues: inner.issues };
    }
    if (!(await verifyExport(envelope.value))) {
      return fail("integrity", "El hash de integridad no coincide: la rutina pudo ser manipulada");
    }
    return { ok: true, routine: inner.value, verified: true };
  }

  const routine = validateRoutine(data);
  if (!routine.ok) {
    return { ok: false, issues: routine.issues };
  }
  return { ok: true, routine: routine.value, verified: false };
}

function isEnvelope(data: unknown): boolean {
  return typeof data === "object" && data !== null && "integrity" in data && "routine" in data;
}

function fail(path: string, message: string): ParseResult {
  return { ok: false, issues: [{ path, message }] };
}
