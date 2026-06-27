// Helpers puros para el registro dinámico de content scripts por origen.
// Sin dependencias de las APIs de Chrome, testeables en Node.

/** Patrón de coincidencia de Chrome para todo el origen (p. ej. `https://x.y/*`). */
export function originMatchPattern(origin: string): string {
  return `${origin}/*`;
}

/**
 * Id estable y válido para `registerContentScripts` derivado del origen.
 * Los ids solo admiten `[A-Za-z0-9_]` y no pueden empezar por `_`.
 */
export function contentScriptId(origin: string): string {
  const safe = origin.replace(/[^A-Za-z0-9]/g, "_");
  return `rutea_recorder_${safe}`;
}
