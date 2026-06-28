// Variables de rutina: extracción, gestión y resolución de referencias.
// Lógica pura. La resolución de secretos se delega al host (Fase 4): aquí solo
// se marcan como pendientes.

import type { Routine, Variable, ValidationIssue } from "../contracts/index.js";

const NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;
const REFERENCE_PATTERN = /^\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}$/;

export type VariableResult =
  { ok: true; routine: Routine } | { ok: false; issues: ValidationIssue[] };

export function referenceToken(name: string): string {
  return `{{${name}}}`;
}

export function isReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE_PATTERN.test(value);
}

export function referenceName(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  return REFERENCE_PATTERN.exec(value)?.[1];
}

/** Convierte el valor de un paso en una variable y sustituye el valor por su referencia. */
export function extractVariable(routine: Routine, stepIndex: number, name: string): VariableResult {
  if (!NAME_PATTERN.test(name)) {
    return fail("name", "Nombre de variable inválido (usa letras, dígitos y guion bajo)");
  }
  if ((routine.variables ?? []).some((variable) => variable.name === name)) {
    return fail("name", `Ya existe una variable llamada ${name}`);
  }
  const step = routine.steps[stepIndex];
  if (!step) {
    return fail("step", "Paso inexistente");
  }
  if (step.value === undefined || step.value === null) {
    return fail("value", "El paso no tiene un valor que convertir en variable");
  }
  if (isReference(step.value)) {
    return fail("value", "El valor ya es una referencia a variable");
  }

  const variable: Variable = {
    name,
    type: inferType(step.value),
    secret: false,
    defaultValue: step.value
  };

  const steps = routine.steps.map((current, index) =>
    index === stepIndex ? { ...current, value: referenceToken(name) } : current
  );

  return {
    ok: true,
    routine: { ...routine, variables: [...(routine.variables ?? []), variable], steps }
  };
}

export function removeVariable(routine: Routine, name: string): VariableResult {
  const referencingStep = routine.steps.findIndex((step) => referenceName(step.value) === name);
  if (referencingStep >= 0) {
    return fail("variable", `La variable ${name} está usada por el paso ${referencingStep + 1}`);
  }
  return {
    ok: true,
    routine: {
      ...routine,
      variables: (routine.variables ?? []).filter((variable) => variable.name !== name)
    }
  };
}

export function updateVariableDefault(
  routine: Routine,
  name: string,
  defaultValue: unknown
): Routine {
  return mapVariable(routine, name, (variable) => ({ ...variable, defaultValue }));
}

/** Marca/desmarca una variable como secreta. Al marcarla, se descarta su valor por defecto. */
export function setVariableSecret(routine: Routine, name: string, secret: boolean): Routine {
  return mapVariable(routine, name, (variable) => {
    if (secret) {
      const updated: Variable = { ...variable, secret: true };
      delete updated.defaultValue;
      return updated;
    }
    return { ...variable, secret: false };
  });
}

/** Mapa de valores no secretos para ejecución: entrada provista sobre el valor por defecto. */
export function resolveInputs(
  routine: Routine,
  provided: Record<string, unknown> = {}
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  for (const variable of routine.variables ?? []) {
    if (variable.secret) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(provided, variable.name)) {
      inputs[variable.name] = provided[variable.name];
    } else if (variable.defaultValue !== undefined) {
      inputs[variable.name] = variable.defaultValue;
    }
  }
  return inputs;
}

export type ResolvedValue = { resolved: true; value: unknown } | { resolved: false; name: string };

/** Sustituye una referencia por su valor resuelto; si no hay valor, queda pendiente. */
export function resolveStepValue(value: unknown, inputs: Record<string, unknown>): ResolvedValue {
  const name = referenceName(value);
  if (name === undefined) {
    return { resolved: true, value };
  }
  if (Object.prototype.hasOwnProperty.call(inputs, name)) {
    return { resolved: true, value: inputs[name] };
  }
  return { resolved: false, name };
}

function inferType(value: unknown): Variable["type"] {
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function mapVariable(
  routine: Routine,
  name: string,
  fn: (variable: Variable) => Variable
): Routine {
  return {
    ...routine,
    variables: (routine.variables ?? []).map((variable) =>
      variable.name === name ? fn(variable) : variable
    )
  };
}

function fail(path: string, message: string): VariableResult {
  return { ok: false, issues: [{ path, message }] };
}
