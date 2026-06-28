// Player: ejecuta un paso de rutina sobre el DOM y responde el resultado.
// La orquestación (máquina de estados, confirmaciones, progreso) vive en el panel;
// aquí solo se actúa sobre un paso y se verifica su postcondición.

import type { Step, Postcondition } from "../contracts/index.js";
import { pickSelector } from "../executor/target.js";

interface ExecuteMessage {
  type?: string;
  step?: Step;
  value?: unknown;
}

interface Outcome {
  ok: boolean;
  selectorUsed?: string;
  error?: string;
}

(() => {
  type RuteaWindow = Window & { __ruteaPlayerInstalled?: boolean };
  const ruteaWindow = window as RuteaWindow;
  if (ruteaWindow.__ruteaPlayerInstalled) {
    return;
  }
  ruteaWindow.__ruteaPlayerInstalled = true;

  chrome.runtime.onMessage.addListener((message: ExecuteMessage, _sender, sendResponse) => {
    if (message.type !== "RUTEA_EXECUTE_STEP" || !message.step) {
      return;
    }
    executeStep(message.step, message.value)
      .then(sendResponse)
      .catch((error: unknown) => sendResponse({ ok: false, error: toErrorMessage(error) }));
    return true;
  });

  async function executeStep(step: Step, value: unknown): Promise<Outcome> {
    let selectorUsed: string | undefined;

    if (requiresTarget(step.action)) {
      const selectors = step.target?.selectors ?? [];
      selectorUsed = pickSelector(selectors, (selector) => safeQuery(selector) !== null);
      if (selectorUsed === undefined) {
        return { ok: false, error: "No se encontró el objetivo del paso" };
      }
      const element = safeQuery(selectorUsed);
      if (element === null) {
        return { ok: false, selectorUsed, error: "El objetivo desapareció antes de actuar" };
      }
      perform(step.action, element, value);
    } else if (step.action === "wait") {
      await sleep(step.timeoutMs ?? 500);
    }

    if (step.postcondition && !checkPostcondition(step.postcondition)) {
      return { ok: false, selectorUsed, error: "La postcondición no se cumplió" };
    }
    return { ok: true, selectorUsed };
  }

  function requiresTarget(action: Step["action"]): boolean {
    return action === "click" || action === "fill" || action === "select" || action === "check";
  }

  function perform(action: Step["action"], element: Element, value: unknown): void {
    if (action === "click" && element instanceof HTMLElement) {
      element.click();
      return;
    }
    if (action === "fill") {
      setInputValue(element, value === undefined || value === null ? "" : String(value));
      return;
    }
    if (action === "select" && element instanceof HTMLSelectElement) {
      element.value = String(value ?? "");
      dispatch(element, "change");
      return;
    }
    if (action === "check" && element instanceof HTMLInputElement) {
      element.checked = value === true || value === "true";
      dispatch(element, "change");
      dispatch(element, "click");
    }
  }

  function setInputValue(element: Element, value: string): void {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      element.focus();
      element.value = value;
      dispatch(element, "input");
      dispatch(element, "change");
    }
  }

  function checkPostcondition(postcondition: Postcondition): boolean {
    const value = postcondition.value;
    switch (postcondition.type) {
      case "urlMatches":
        return typeof value === "string" && location.href.includes(value);
      case "textVisible":
        return typeof value === "string" && (document.body?.innerText ?? "").includes(value);
      case "elementVisible":
        return isVisible(postconditionTarget(postcondition));
      case "elementHidden":
        return !isVisible(postconditionTarget(postcondition));
      case "valueEquals": {
        const element = postconditionTarget(postcondition);
        if (
          element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement ||
          element instanceof HTMLTextAreaElement
        ) {
          return element.value === String(value ?? "");
        }
        return false;
      }
      default:
        return false;
    }
  }

  function postconditionTarget(postcondition: Postcondition): Element | null {
    const selectors = postcondition.target?.selectors ?? [];
    const selector = pickSelector(selectors, (candidate) => safeQuery(candidate) !== null);
    return selector === undefined ? null : safeQuery(selector);
  }

  function isVisible(element: Element | null): boolean {
    if (!(element instanceof HTMLElement)) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && element.offsetParent !== null;
  }

  function safeQuery(selector: string): Element | null {
    try {
      return document.querySelector(selector);
    } catch {
      return null;
    }
  }

  function dispatch(element: Element, type: string): void {
    element.dispatchEvent(new Event(type, { bubbles: true }));
  }

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, Math.min(Math.max(ms, 0), 120000)));
  }

  function toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
})();
