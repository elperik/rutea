// Generación y puntuación de selectores. La recolección de señales toca el DOM;
// el ranking es una función pura, testeable en Node sin navegador.

export interface ElementSignals {
  tag: string;
  id?: string;
  testId?: string;
  name?: string;
  /** Selector CSS estructural (ruta de tipos con nth-of-type). */
  structural?: string;
}

export type SelectorQuality = "high" | "medium" | "low";

export interface RankedSelector {
  selector: string;
  quality: SelectorQuality;
  /** Explicación de por qué se eligió este selector. */
  rationale: string;
}

/**
 * Ordena selectores por estabilidad y adjunta una explicación a cada uno.
 * Prioridad: id > data-testid > name > ruta estructural.
 */
export function rankSelectors(signals: ElementSignals): RankedSelector[] {
  const ranked: RankedSelector[] = [];

  if (signals.id) {
    ranked.push({
      selector: `#${escapeIdent(signals.id)}`,
      quality: "high",
      rationale: "Identificador de elemento, normalmente único y estable."
    });
  }

  if (signals.testId) {
    ranked.push({
      selector: `[data-testid="${escapeAttribute(signals.testId)}"]`,
      quality: "high",
      rationale: "Atributo data-testid pensado para automatización."
    });
  }

  if (signals.name) {
    ranked.push({
      selector: `${signals.tag}[name="${escapeAttribute(signals.name)}"]`,
      quality: "medium",
      rationale: "Atributo name del control de formulario."
    });
  }

  if (signals.structural) {
    ranked.push({
      selector: signals.structural,
      quality: "low",
      rationale: "Ruta estructural; puede romperse si cambia el DOM."
    });
  }

  return dedupeBySelector(ranked);
}

function dedupeBySelector(selectors: RankedSelector[]): RankedSelector[] {
  const seen = new Set<string>();
  const result: RankedSelector[] = [];
  for (const candidate of selectors) {
    if (!seen.has(candidate.selector)) {
      seen.add(candidate.selector);
      result.push(candidate);
    }
  }
  return result;
}

/** Escapa un valor para usarlo dentro de comillas dobles en un selector de atributo. */
export function escapeAttribute(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Escape aproximado de un identificador CSS, válido en Node (sin depender de
 * `CSS.escape`). Cubre los casos habituales de id y dígitos iniciales.
 */
export function escapeIdent(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index] ?? "";
    const isSafe = /[a-zA-Z0-9_-]/.test(char);
    if (isSafe) {
      result += char;
    } else {
      result += `\\${char}`;
    }
  }
  if (/^[0-9]/.test(result)) {
    result = `\\3${result[0]} ${result.slice(1)}`;
  }
  return result;
}
