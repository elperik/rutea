import { describe, expect, it } from "vitest";

import {
  validateAiNavigationProposal,
  validateAiNavigationRequest,
  validateRoutine,
  validateScreenContext
} from "./index.js";

const ROUTINE_ID = "11111111-1111-4111-8111-111111111111";
const STEP_ID = "22222222-2222-4222-8222-222222222222";
const PROPOSAL_ID = "33333333-3333-4333-8333-333333333333";
const ACTION_ID = "44444444-4444-4444-8444-444444444444";
const HASH = "a".repeat(64);

function screenContext() {
  return {
    schemaVersion: 1,
    url: "https://intranet.gpex.es/",
    title: "GPEX",
    capturedAt: "2026-06-28T12:00:00Z",
    viewport: { width: 1280, height: 720 },
    controls: [
      {
        id: "c1",
        kind: "select",
        role: "combobox",
        accessibleName: "Mes",
        label: "Mes",
        value: "Mayo",
        options: ["Mayo", "Junio"],
        visible: true,
        enabled: true,
        locatorCandidates: [{ kind: "role", value: "combobox", name: "Mes" }]
      }
    ],
    tables: [],
    actions: [
      {
        actionId: "a1",
        kind: "select",
        controlId: "c1",
        description: "Seleccionar el mes",
        risk: "low"
      }
    ],
    redactions: [],
    truncated: false,
    contextHash: HASH
  };
}

function limits() {
  return {
    maxModelTurns: 5,
    maxActions: 10,
    maxIterations: 1,
    maxInputBytes: 65_536,
    maxScreenshotCount: 2,
    maxDurationMs: 60_000,
    maxEstimatedCostUsd: 0.1
  };
}

describe("paso assist", () => {
  it("acepta una instrucción asistida acotada", () => {
    const result = validateRoutine({
      schemaVersion: 1,
      id: ROUTINE_ID,
      name: "Consulta asistida",
      allowedDomains: ["intranet.gpex.es"],
      steps: [
        {
          id: STEP_ID,
          action: "assist",
          strategy: "auto",
          observationMode: "semantic-first",
          instruction: "Selecciona junio y pulsa Buscar",
          allowedActions: ["select", "click", "assert"],
          ...limits(),
          risk: "medium",
          confirmationRequired: false
        }
      ]
    });

    expect(result.ok).toBe(true);
  });

  it("rechaza assist sin presupuestos obligatorios", () => {
    const result = validateRoutine({
      schemaVersion: 1,
      id: ROUTINE_ID,
      name: "Sin límites",
      allowedDomains: ["intranet.gpex.es"],
      steps: [
        {
          id: STEP_ID,
          action: "assist",
          strategy: "structured",
          observationMode: "semantic",
          instruction: "Pulsa Buscar",
          allowedActions: ["click"],
          risk: "low",
          confirmationRequired: false
        }
      ]
    });

    expect(result.ok).toBe(false);
  });

  it("rechaza un bucle sin condición de parada", () => {
    const result = validateRoutine({
      schemaVersion: 1,
      id: ROUTINE_ID,
      name: "Bucle sin parada",
      allowedDomains: ["intranet.gpex.es"],
      steps: [
        {
          id: STEP_ID,
          action: "assist",
          strategy: "auto",
          observationMode: "semantic-first",
          instruction: "Procesa todos los registros",
          allowedActions: ["click", "assert"],
          ...limits(),
          maxIterations: 5,
          risk: "high",
          confirmationRequired: true
        }
      ]
    });

    expect(result.ok).toBe(false);
  });
});

describe("ScreenContext", () => {
  it("acepta un contexto semántico mínimo", () => {
    expect(validateScreenContext(screenContext()).ok).toBe(true);
  });

  it("rechaza campos no declarados", () => {
    expect(validateScreenContext({ ...screenContext(), htmlCompleto: "<html />" }).ok).toBe(false);
  });
});

describe("navegación IA", () => {
  it("acepta una petición con estrategia auto y límites", () => {
    const result = validateAiNavigationRequest({
      schemaVersion: 1,
      requestId: ROUTINE_ID,
      strategy: "auto",
      instruction: "Selecciona junio",
      url: "https://intranet.gpex.es/",
      allowedDomains: ["intranet.gpex.es"],
      allowedActions: ["select", "assert"],
      limits: limits(),
      screenContext: screenContext()
    });

    expect(result.ok).toBe(true);
  });

  it("rechaza una petición fuera del presupuesto", () => {
    const result = validateAiNavigationRequest({
      schemaVersion: 1,
      requestId: ROUTINE_ID,
      strategy: "structured",
      instruction: "Selecciona junio",
      url: "https://intranet.gpex.es/",
      allowedDomains: ["intranet.gpex.es"],
      allowedActions: ["select"],
      limits: { ...limits(), maxModelTurns: 0 },
      screenContext: screenContext()
    });

    expect(result.ok).toBe(false);
  });

  it("acepta grounding semántico sobre un control conocido", () => {
    const result = validateAiNavigationProposal({
      schemaVersion: 1,
      proposalId: PROPOSAL_ID,
      requestId: ROUTINE_ID,
      status: "actions_proposed",
      strategyUsed: "structured",
      actions: [
        {
          id: ACTION_ID,
          grounding: "semantic",
          action: "select",
          controlId: "c1",
          value: "Junio",
          risk: "low",
          requiresConfirmation: false,
          rationale: "El control está etiquetado como Mes"
        }
      ],
      explanation: "Seleccionar junio"
    });

    expect(result.ok).toBe(true);
  });

  it("rechaza grounding semántico sin referencia de pantalla", () => {
    const result = validateAiNavigationProposal({
      schemaVersion: 1,
      proposalId: PROPOSAL_ID,
      requestId: ROUTINE_ID,
      status: "actions_proposed",
      strategyUsed: "structured",
      actions: [
        {
          id: ACTION_ID,
          grounding: "semantic",
          action: "click",
          risk: "low",
          requiresConfirmation: false,
          rationale: "Objetivo inventado"
        }
      ],
      explanation: "Pulsar"
    });

    expect(result.ok).toBe(false);
  });

  it("acepta una acción visual explícita", () => {
    const result = validateAiNavigationProposal({
      schemaVersion: 1,
      proposalId: PROPOSAL_ID,
      requestId: ROUTINE_ID,
      status: "actions_proposed",
      strategyUsed: "computer",
      actions: [
        {
          id: ACTION_ID,
          grounding: "visual",
          action: "click",
          computer: { x: 320, y: 180, button: "left" },
          risk: "low",
          requiresConfirmation: false,
          rationale: "Fallback visual autorizado"
        }
      ],
      explanation: "Pulsar el control visual"
    });

    expect(result.ok).toBe(true);
  });
});
