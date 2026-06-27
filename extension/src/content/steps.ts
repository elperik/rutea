// Normalización y deduplicación de pasos grabados. Lógica pura, sin DOM.

export type RecordedAction = "click" | "fill" | "select" | "check";

export interface RecordedStepLike {
  action: RecordedAction;
  url: string;
  primarySelector: string | undefined;
  value?: string | boolean | null;
}

const VALUE_ACTIONS: ReadonlySet<RecordedAction> = new Set(["fill", "select", "check"]);

/** Dos pasos son equivalentes si comparten acción, URL, objetivo y valor. */
export function isEquivalent(a: RecordedStepLike, b: RecordedStepLike): boolean {
  return (
    a.action === b.action &&
    a.url === b.url &&
    a.primarySelector === b.primarySelector &&
    a.value === b.value
  );
}

/** Mismo control de entrada (acción con valor) sobre el mismo objetivo y URL. */
function isSameTarget(a: RecordedStepLike, b: RecordedStepLike): boolean {
  return (
    a.action === b.action &&
    a.url === b.url &&
    a.primarySelector === b.primarySelector &&
    a.primarySelector !== undefined &&
    VALUE_ACTIONS.has(a.action)
  );
}

/**
 * Añade un paso aplicando deduplicación:
 * - si es equivalente al último, no añade nada;
 * - si es una acción con valor sobre el mismo objetivo que el último (p. ej.
 *   escritura sucesiva), sustituye el último por el nuevo valor;
 * - en otro caso, lo añade.
 *
 * Devuelve una nueva lista; no muta la entrada.
 */
export function appendStep<T extends RecordedStepLike>(steps: readonly T[], candidate: T): T[] {
  const previous = steps[steps.length - 1];

  if (previous && isEquivalent(previous, candidate)) {
    return [...steps];
  }

  if (previous && isSameTarget(previous, candidate)) {
    return [...steps.slice(0, -1), candidate];
  }

  return [...steps, candidate];
}
