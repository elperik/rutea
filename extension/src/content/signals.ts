// Recolección de señales de un elemento del DOM para construir su descriptor.
// Aislado del ranking (que es puro) para mantener la lógica testeable separada.

import type { ElementSignals } from "./selectors.js";

export function collectSignals(element: Element): ElementSignals {
  return {
    tag: element.tagName.toLowerCase(),
    id: element.getAttribute("id") ?? undefined,
    testId: element.getAttribute("data-testid") ?? undefined,
    name: element.getAttribute("name") ?? undefined,
    structural: buildStructuralSelector(element)
  };
}

// Ruta estructural por tipos con nth-of-type, acotada en profundidad.
function buildStructuralSelector(element: Element): string | undefined {
  const segments: string[] = [];
  let current: Element | null = element;

  while (current !== null && current !== document.documentElement && segments.length < 5) {
    const currentElement: Element = current;
    let segment = currentElement.tagName.toLowerCase();
    const parent: Element | null = currentElement.parentElement;

    if (parent !== null) {
      const siblings = Array.from(parent.children).filter(
        (candidate) => candidate.tagName === currentElement.tagName
      );
      if (siblings.length > 1) {
        segment += `:nth-of-type(${siblings.indexOf(currentElement) + 1})`;
      }
    }

    segments.unshift(segment);
    current = parent;
  }

  return segments.length > 0 ? segments.join(" > ") : undefined;
}
