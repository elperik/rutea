// Exportación e importación de rutinas. Funciones puras: la importación trata
// el texto como no confiable y lo valida contra el contrato antes de aceptarlo.

import { validateRoutine, type Routine, type ValidationIssue } from "../contracts/index.js";

export type ParseResult = { ok: true; routine: Routine } | { ok: false; issues: ValidationIssue[] };

/** Serializa una rutina a JSON legible. No añade secretos: exporta tal cual. */
export function serializeRoutine(routine: Routine): string {
  return JSON.stringify(routine, null, 2);
}

/** Parsea y valida un texto importado, rechazando JSON inválido o no conforme. */
export function parseRoutine(text: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, issues: [{ path: "(raíz)", message: "El fichero no es JSON válido" }] };
  }
  const result = validateRoutine(data);
  if (result.ok) {
    return { ok: true, routine: result.value };
  }
  return { ok: false, issues: result.issues };
}
