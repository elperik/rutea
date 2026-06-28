// Selección de objetivo: devuelve el primer selector que satisface el test.
// El test se inyecta (en el player es `querySelector`), de modo que esta lógica
// es pura y testeable en Node.

export function pickSelector(
  selectors: readonly string[],
  test: (selector: string) => boolean
): string | undefined {
  for (const selector of selectors) {
    if (test(selector)) {
      return selector;
    }
  }
  return undefined;
}
