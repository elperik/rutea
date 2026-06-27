import { describe, expect, it } from "vitest";

import {
  MAX_NATIVE_MESSAGE_BYTES,
  validateHelloRequest,
  validateHelloResult,
  validateNativeMessage,
  validateNativeResponse,
  validateRoutine,
  withinSizeLimit
} from "./index.js";

const UUID = "11111111-1111-4111-8111-111111111111";
const UUID_2 = "22222222-2222-4222-8222-222222222222";
const TIMESTAMP = "2026-06-27T18:00:00Z";

describe("sobre de mensaje Native Messaging", () => {
  it("acepta un sobre mínimo válido", () => {
    const result = validateNativeMessage({
      protocolVersion: 1,
      messageId: UUID,
      type: "hello",
      timestamp: TIMESTAMP
    });
    expect(result.ok).toBe(true);
  });

  it("acepta un sobre completo válido", () => {
    const result = validateNativeMessage({
      protocolVersion: 1,
      messageId: UUID,
      correlationId: UUID_2,
      type: "routine.execute",
      timestamp: TIMESTAMP,
      payload: { foo: "bar" },
      meta: { extensionVersion: "0.1.0", hostVersion: "0.1.0" }
    });
    expect(result.ok).toBe(true);
  });

  it("rechaza un sobre al que le falta un campo obligatorio", () => {
    const result = validateNativeMessage({
      protocolVersion: 1,
      messageId: UUID,
      timestamp: TIMESTAMP
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it("rechaza campos desconocidos", () => {
    const result = validateNativeMessage({
      protocolVersion: 1,
      messageId: UUID,
      type: "hello",
      timestamp: TIMESTAMP,
      inesperado: true
    });
    expect(result.ok).toBe(false);
  });

  it("rechaza una versión de protocolo incompatible", () => {
    const result = validateNativeMessage({
      protocolVersion: 0,
      messageId: UUID,
      type: "hello",
      timestamp: TIMESTAMP
    });
    expect(result.ok).toBe(false);
  });

  it("rechaza un tipo con formato inválido", () => {
    const result = validateNativeMessage({
      protocolVersion: 1,
      messageId: UUID,
      type: "Hello Mundo",
      timestamp: TIMESTAMP
    });
    expect(result.ok).toBe(false);
  });
});

describe("respuesta Native Messaging", () => {
  it("acepta una respuesta correcta", () => {
    const result = validateNativeResponse({
      protocolVersion: 1,
      correlationId: UUID,
      timestamp: TIMESTAMP,
      ok: true,
      payload: { service: "rutea-native-host" }
    });
    expect(result.ok).toBe(true);
  });

  it("acepta una respuesta de error con código de la taxonomía", () => {
    const result = validateNativeResponse({
      protocolVersion: 1,
      correlationId: UUID,
      timestamp: TIMESTAMP,
      ok: false,
      error: { code: "VALIDATION_ERROR", message: "Mensaje inválido" }
    });
    expect(result.ok).toBe(true);
  });

  it("rechaza un código de error fuera de la taxonomía", () => {
    const result = validateNativeResponse({
      protocolVersion: 1,
      correlationId: UUID,
      timestamp: TIMESTAMP,
      ok: false,
      error: { code: "BOOM", message: "desconocido" }
    });
    expect(result.ok).toBe(false);
  });

  it("rechaza una respuesta sin correlationId", () => {
    const result = validateNativeResponse({
      protocolVersion: 1,
      timestamp: TIMESTAMP,
      ok: true
    });
    expect(result.ok).toBe(false);
  });
});

describe("negociación de protocolo", () => {
  it("acepta una petición hello válida", () => {
    expect(validateHelloRequest({ requestedProtocolVersions: [1] }).ok).toBe(true);
  });

  it("rechaza una petición hello sin versiones", () => {
    expect(validateHelloRequest({ requestedProtocolVersions: [] }).ok).toBe(false);
  });

  it("acepta un resultado hello válido", () => {
    const result = validateHelloResult({
      protocolVersion: 1,
      supportedProtocolVersions: [1],
      service: "rutea-native-host",
      capabilities: ["routine.execute"]
    });
    expect(result.ok).toBe(true);
  });
});

describe("rutina", () => {
  it("acepta una rutina mínima válida", () => {
    const result = validateRoutine({
      schemaVersion: 1,
      id: UUID,
      name: "Consulta de prueba",
      allowedDomains: ["fixtures.local"],
      steps: [
        {
          id: UUID_2,
          action: "navigate",
          risk: "low",
          confirmationRequired: false
        }
      ]
    });
    expect(result.ok).toBe(true);
  });

  it("rechaza una rutina sin dominios autorizados", () => {
    const result = validateRoutine({
      schemaVersion: 1,
      id: UUID,
      name: "Sin dominios",
      allowedDomains: [],
      steps: []
    });
    expect(result.ok).toBe(false);
  });

  it("rechaza un paso con acción fuera del catálogo", () => {
    const result = validateRoutine({
      schemaVersion: 1,
      id: UUID,
      name: "Acción inválida",
      allowedDomains: ["fixtures.local"],
      steps: [
        {
          id: UUID_2,
          action: "explode",
          risk: "low",
          confirmationRequired: false
        }
      ]
    });
    expect(result.ok).toBe(false);
  });
});

describe("límite de tamaño", () => {
  it("acepta un valor dentro del límite", () => {
    expect(withinSizeLimit({ foo: "bar" })).toBe(true);
  });

  it("rechaza un valor que supera el límite", () => {
    const huge = "a".repeat(MAX_NATIVE_MESSAGE_BYTES + 1);
    expect(withinSizeLimit(huge)).toBe(false);
  });
});
