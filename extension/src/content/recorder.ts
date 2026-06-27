(() => {
  interface RecordedTarget {
    tag: string;
    // Señales ordenadas por calidad, alineadas con el descriptor `target.selectors`
    // del contrato de rutina (shared/routine.schema.json y doc 004).
    selectors: string[];
    role?: string;
    accessibleName?: string;
    label?: string;
    name?: string;
    testId?: string;
  }

  interface RecordedStep {
    id: string;
    action: "click" | "fill" | "select" | "check";
    url: string;
    target: RecordedTarget;
    value?: string | boolean | null;
    recordedAt: string;
  }

  type RuteaWindow = Window & { __ruteaRecorderInstalled?: boolean };

  const ruteaWindow = window as RuteaWindow;
  const storageKey = "rutea.recordedSteps";
  let recording = false;

  if (ruteaWindow.__ruteaRecorderInstalled) {
    return;
  }

  ruteaWindow.__ruteaRecorderInstalled = true;

  chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
    if (message.type === "RUTEA_START_RECORDING") {
      recording = true;
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "RUTEA_STOP_RECORDING") {
      recording = false;
      sendResponse({ ok: true });
    }
  });

  document.addEventListener("click", onClick, true);
  document.addEventListener("change", onChange, true);

  function onClick(event: MouseEvent): void {
    if (!recording || !(event.target instanceof Element)) {
      return;
    }

    void appendStep({
      id: crypto.randomUUID(),
      action: "click",
      url: location.href,
      target: describeTarget(event.target),
      recordedAt: new Date().toISOString()
    });
  }

  function onChange(event: Event): void {
    const target = event.target;
    if (
      !recording ||
      !(
        target instanceof HTMLInputElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLTextAreaElement
      )
    ) {
      return;
    }

    let action: RecordedStep["action"] = "fill";
    let value: RecordedStep["value"] = target.value;

    if (target instanceof HTMLSelectElement) {
      action = "select";
    } else if (
      target instanceof HTMLInputElement &&
      (target.type === "checkbox" || target.type === "radio")
    ) {
      action = "check";
      value = target.checked;
    } else if (target instanceof HTMLInputElement && target.type === "password") {
      value = null;
    }

    void appendStep({
      id: crypto.randomUUID(),
      action,
      url: location.href,
      target: describeTarget(target),
      value,
      recordedAt: new Date().toISOString()
    });
  }

  async function appendStep(step: RecordedStep): Promise<void> {
    const stored = await chrome.storage.local.get(storageKey);
    const current = stored[storageKey];
    const steps: RecordedStep[] = Array.isArray(current) ? current : [];
    steps.push(step);
    await chrome.storage.local.set({ [storageKey]: steps });
  }

  function describeTarget(element: Element): RecordedTarget {
    const label = getLabel(element);
    const ariaLabel = element.getAttribute("aria-label") ?? undefined;
    const text = element.textContent?.trim().replace(/\s+/g, " ").slice(0, 120) || undefined;

    return {
      tag: element.tagName.toLowerCase(),
      selectors: buildSelectors(element),
      role: element.getAttribute("role") ?? undefined,
      accessibleName: ariaLabel ?? label ?? text,
      label,
      name: element.getAttribute("name") ?? undefined,
      testId: element.getAttribute("data-testid") ?? undefined
    };
  }

  function getLabel(element: Element): string | undefined {
    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLTextAreaElement
    ) {
      const explicitLabel = element.labels?.[0]?.textContent?.trim();
      if (explicitLabel) {
        return explicitLabel.replace(/\s+/g, " ").slice(0, 120);
      }
    }

    return (
      element.closest("label")?.textContent?.trim().replace(/\s+/g, " ").slice(0, 120) || undefined
    );
  }

  // Devuelve varios selectores ordenados por estabilidad. El primero es el preferido;
  // los siguientes sirven como alternativas para la futura recuperación del ejecutor.
  function buildSelectors(element: Element): string[] {
    const selectors: string[] = [];

    const id = element.getAttribute("id");
    if (id) {
      selectors.push(`#${CSS.escape(id)}`);
    }

    const testId = element.getAttribute("data-testid");
    if (testId) {
      selectors.push(`[data-testid="${escapeAttribute(testId)}"]`);
    }

    const name = element.getAttribute("name");
    if (name) {
      selectors.push(`${element.tagName.toLowerCase()}[name="${escapeAttribute(name)}"]`);
    }

    const structural = buildStructuralSelector(element);
    if (structural && !selectors.includes(structural)) {
      selectors.push(structural);
    }

    return selectors;
  }

  function buildStructuralSelector(element: Element): string {
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

    return segments.join(" > ");
  }

  function escapeAttribute(value: string): string {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  }
})();
