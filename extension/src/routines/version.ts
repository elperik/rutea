// Versionado e integridad de rutinas: canonicalización estable y hash SHA-256,
// para producir y verificar sobres de exportación.

import type { Routine, RoutineExport } from "../contracts/index.js";

/** Serialización determinista con claves ordenadas, base del hash reproducible. */
export function canonicalRoutine(routine: Routine): string {
  return stableStringify(routine);
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record)
    .filter((key) => record[key] !== undefined)
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(",")}}`;
}

export async function hashRoutine(routine: Routine): Promise<string> {
  const data = new TextEncoder().encode(canonicalRoutine(routine));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(digest);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildExport(
  routine: Routine,
  now: Date = new Date()
): Promise<RoutineExport> {
  return {
    schemaVersion: 1,
    exportedAt: now.toISOString(),
    integrity: { algorithm: "SHA-256", hash: await hashRoutine(routine) },
    routine
  };
}

/** Recalcula el hash de la rutina del sobre y lo compara con el declarado. */
export async function verifyExport(envelope: RoutineExport): Promise<boolean> {
  const expected = await hashRoutine(envelope.routine as Routine);
  return constantTimeEquals(expected, envelope.integrity.hash);
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
