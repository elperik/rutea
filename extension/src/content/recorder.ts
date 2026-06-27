import { collectSignals } from "./signals.js";
import { rankSelectors, type RankedSelector } from "./selectors.js";
import { appendStep, type RecordedAction, type RecordedStepLike } from "./steps.js";

(() => {
  interface RecordedTarget {
    tag: string;
    selectors: string[];
    selectorDetails: RankedSelector[];
    role?: string;
    accessibleName?: string;
    label?: string;
    name?: string;
    testId?: string;
  }

  interface RecordedStep extends RecordedStepLike {
    id: string;
    action: RecordedAction;
    url: string;
    primarySelector: string | undefined;
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

  // Reanuda la grabación si el grabador se reinyecta en una página ya en sesión.
  void resumeIfRecording();

  async function resumeIfRecording(): Promise<void> {
    try {
      const response = (await chrome.runtime.sendMessage({ type: "RUTEA_IS_RECORDING" })) as {
        ok?: boolean;
        data?: { recording?: boolean };
      };
      if (response?.data?.recording) {
        recording = true;
      }
    } catch {
      // El service worker puede no estar disponible momentáneamente; se ignora.
    }
  }

  function onClick(event: MouseEvent): void {
    if (!recording || !(event.target instanceof Element)) {
      return;
    }
    const target = describeTarget(event.target);
    highlight(event.target);
    void persist({
      id: crypto.randomUUID(),
      action: "click",
      url: location.href,
      primarySelector: target.selectors[0],
      target,
      recordedAt: new Date().toISOString()
    });
  }

  function onChange(event: Event): void {
    const element = event.target;
    if (
      !recording ||
      !(
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      )
    ) {
      return;
    }

    let action: RecordedAction = "fill";
    let value: RecordedStep["value"] = element.value;

    if (element instanceof HTMLSelectElement) {
      action = "select";
    } else if (
      element instanceof HTMLInputElement &&
      (element.type === "checkbox" || element.type === "radio")
    ) {
      action = "check";
      value = element.checked;
    } else if (element instanceof HTMLInputElement && isSensitive(element)) {
      value = null;
    }

    const target = describeTarget(element);
    highlight(element);
    void persist({
      id: crypto.randomUUID(),
      action,
      url: location.href,
      primarySelector: target.selectors[0],
      target,
      value,
      recordedAt: new Date().toISOString()
    });
  }

  async function persist(step: RecordedStep): Promise<void> {
    const stored = await chrome.storage.local.get(storageKey);
    const current = stored[storageKey];
    const steps: RecordedStep[] = Array.isArray(current) ? current : [];
    await chrome.storage.local.set({ [storageKey]: appendStep(steps, step) });
  }

  // Un campo es sensible si es de tipo password o está marcado explícitamente.
  function isSensitive(element: HTMLInputElement): boolean {
    return (
      element.type === "password" ||
      element.getAttribute("data-rutea-sensitive") === "true" ||
      element.autocomplete === "current-password" ||
      element.autocomplete === "new-password"
    );
  }

  function describeTarget(element: Element): RecordedTarget {
    const signals = collectSignals(element);
    const ranked = rankSelectors(signals);
    const label = getLabel(element);
    const ariaLabel = element.getAttribute("aria-label") ?? undefined;
    const text = element.textContent?.trim().replace(/\s+/g, " ").slice(0, 120) || undefined;

    return {
      tag: signals.tag,
      selectors: ranked.map((entry) => entry.selector),
      selectorDetails: ranked,
      role: element.getAttribute("role") ?? undefined,
      accessibleName: ariaLabel ?? label ?? text,
      label,
      name: signals.name,
      testId: signals.testId
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

  // Resaltado breve y no bloqueante del elemento capturado.
  function highlight(element: Element): void {
    if (!(element instanceof HTMLElement)) {
      return;
    }
    const previousOutline = element.style.outline;
    element.style.outline = "2px solid #2d7ff9";
    window.setTimeout(() => {
      element.style.outline = previousOutline;
    }, 300);
  }
})();
