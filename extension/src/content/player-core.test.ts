import { beforeEach, describe, expect, it } from "vitest";

import { executeStep } from "./player-core.js";
import type { Step } from "../contracts/index.js";

let counter = 0;
function step(overrides: Partial<Step>): Step {
  counter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
    action: "click",
    risk: "low",
    confirmationRequired: false,
    ...overrides
  };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("executeStep · fill", () => {
  it("aplica el valor y dispara input/change", async () => {
    document.body.innerHTML = `<input id="nombre" />`;
    const input = document.querySelector("#nombre") as HTMLInputElement;
    const events: string[] = [];
    input.addEventListener("input", () => events.push("input"));
    input.addEventListener("change", () => events.push("change"));

    const outcome = await executeStep(
      step({ action: "fill", target: { selectors: ["#nombre"] } }),
      "Ana"
    );

    expect(outcome.ok).toBe(true);
    expect(outcome.selectorUsed).toBe("#nombre");
    expect(input.value).toBe("Ana");
    expect(events).toEqual(["input", "change"]);
  });
});

describe("executeStep · click", () => {
  it("invoca el manejador del objetivo", async () => {
    document.body.innerHTML = `<button id="go">Ir</button>`;
    let clicked = false;
    document.querySelector("#go")?.addEventListener("click", () => {
      clicked = true;
    });

    const outcome = await executeStep(
      step({ action: "click", target: { selectors: ["#go"] } }),
      undefined
    );

    expect(outcome.ok).toBe(true);
    expect(clicked).toBe(true);
  });
});

describe("executeStep · check y select", () => {
  it("marca un checkbox y dispara change", async () => {
    document.body.innerHTML = `<input id="acepta" type="checkbox" />`;
    const checkbox = document.querySelector("#acepta") as HTMLInputElement;
    let changed = false;
    checkbox.addEventListener("change", () => {
      changed = true;
    });

    const outcome = await executeStep(
      step({ action: "check", target: { selectors: ["#acepta"] } }),
      true
    );

    expect(outcome.ok).toBe(true);
    expect(checkbox.checked).toBe(true);
    expect(changed).toBe(true);
  });

  it("selecciona una opción", async () => {
    document.body.innerHTML = `<select id="pais"><option value=""></option><option value="es">España</option></select>`;
    const select = document.querySelector("#pais") as HTMLSelectElement;

    const outcome = await executeStep(
      step({ action: "select", target: { selectors: ["#pais"] } }),
      "es"
    );

    expect(outcome.ok).toBe(true);
    expect(select.value).toBe("es");
  });
});

describe("executeStep · objetivo y postcondición", () => {
  it("falla si no encuentra el objetivo", async () => {
    const outcome = await executeStep(
      step({ action: "click", target: { selectors: ["#no-existe"] } }),
      undefined
    );
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toMatch(/objetivo/i);
  });

  it("usa el primer selector que casa", async () => {
    document.body.innerHTML = `<button id="b">B</button>`;
    const outcome = await executeStep(
      step({ action: "click", target: { selectors: ["#a", "#b"] } }),
      undefined
    );
    expect(outcome.selectorUsed).toBe("#b");
  });

  it("verifica una postcondición valueEquals cumplida", async () => {
    document.body.innerHTML = `<input id="nombre" />`;
    const outcome = await executeStep(
      step({
        action: "fill",
        target: { selectors: ["#nombre"] },
        postcondition: { type: "valueEquals", value: "Ana", target: { selectors: ["#nombre"] } }
      }),
      "Ana"
    );
    expect(outcome.ok).toBe(true);
  });

  it("falla si la postcondición no se cumple", async () => {
    document.body.innerHTML = `<input id="nombre" />`;
    const outcome = await executeStep(
      step({
        action: "fill",
        target: { selectors: ["#nombre"] },
        postcondition: { type: "valueEquals", value: "Otro", target: { selectors: ["#nombre"] } }
      }),
      "Ana"
    );
    expect(outcome.ok).toBe(false);
    expect(outcome.error).toMatch(/postcondición/i);
  });
});

describe("executeStep · wait", () => {
  it("espera y termina ok", async () => {
    const outcome = await executeStep(step({ action: "wait", timeoutMs: 0 }), undefined);
    expect(outcome.ok).toBe(true);
  });
});
