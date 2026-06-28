// Punto de entrada de los contratos compartidos para la extensión.
// Reexporta los tipos generados y expone validadores tipados sobre los
// validadores standalone (sin `eval`, compatibles con la CSP de Manifest V3).

import * as validators from "./validators.generated.js";
import type {
  NativeMessage,
  NativeResponse,
  HelloRequest,
  HelloResult,
  Routine,
  RoutineExport
} from "./types.js";

export type {
  NativeMessage,
  NativeResponse,
  HelloRequest,
  HelloResult,
  Routine,
  RoutineExport,
  Variable,
  Step,
  Target,
  Postcondition
} from "./types.js";

/** Versión de protocolo Native Messaging que entiende esta extensión. */
export const PROTOCOL_VERSION = 1;

/** Límite defensivo de tamaño para un sobre serializado, alineado con el host. */
export const MAX_NATIVE_MESSAGE_BYTES = 1_048_576;

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; issues: ValidationIssue[] };

type StandaloneValidator = (typeof validators)["nativeMessage"];

function toIssues(validator: StandaloneValidator): ValidationIssue[] {
  const errors = validator.errors ?? [];
  if (errors.length === 0) {
    return [{ path: "", message: "No cumple el contrato" }];
  }
  return errors.map((error) => ({
    path: error.instancePath || "(raíz)",
    message: error.message ?? "valor inválido"
  }));
}

function validateWith<T>(validator: StandaloneValidator, data: unknown): ValidationResult<T> {
  if (validator(data)) {
    return { ok: true, value: data as T };
  }
  return { ok: false, issues: toIssues(validator) };
}

export function validateNativeMessage(data: unknown): ValidationResult<NativeMessage> {
  return validateWith<NativeMessage>(validators.nativeMessage, data);
}

export function validateNativeResponse(data: unknown): ValidationResult<NativeResponse> {
  return validateWith<NativeResponse>(validators.nativeResponse, data);
}

export function validateHelloRequest(data: unknown): ValidationResult<HelloRequest> {
  return validateWith<HelloRequest>(validators.helloRequest, data);
}

export function validateHelloResult(data: unknown): ValidationResult<HelloResult> {
  return validateWith<HelloResult>(validators.helloResult, data);
}

export function validateRoutine(data: unknown): ValidationResult<Routine> {
  return validateWith<Routine>(validators.routine, data);
}

export function validateRoutineExport(data: unknown): ValidationResult<RoutineExport> {
  return validateWith<RoutineExport>(validators.routineExport, data);
}

/** Comprueba que el valor serializado no supere el límite de tamaño del protocolo. */
export function withinSizeLimit(value: unknown, maxBytes = MAX_NATIVE_MESSAGE_BYTES): boolean {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return new TextEncoder().encode(serialized).byteLength <= maxBytes;
}
