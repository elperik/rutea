// Conversión pura de una grabación en una `Routine` validada contra el contrato.

import {
  validateRoutine,
  type Routine,
  type Step,
  type Target,
  type ValidationIssue
} from "../contracts/index.js";

export interface RecordedTargetInput {
  selectors?: string[];
  role?: string;
  accessibleName?: string;
  label?: string;
  name?: string;
  testId?: string;
}

export interface RecordedStepInput {
  id: string;
  action: "click" | "fill" | "select" | "check";
  url: string;
  target?: RecordedTargetInput;
  value?: string | boolean | null;
}

export interface BuildOptions {
  /** Permite inyectar el id de la rutina en pruebas; por defecto se genera. */
  id?: string;
}

export type BuildResult = { ok: true; routine: Routine } | { ok: false; issues: ValidationIssue[] };

export function buildRoutineFromRecording(
  name: string,
  steps: readonly RecordedStepInput[],
  options: BuildOptions = {}
): BuildResult {
  if (name.trim().length === 0) {
    return { ok: false, issues: [{ path: "name", message: "La rutina necesita un nombre" }] };
  }
  if (steps.length === 0) {
    return { ok: false, issues: [{ path: "steps", message: "La grabación no tiene pasos" }] };
  }

  const allowedDomains = deriveDomains(steps);
  if (allowedDomains.length === 0) {
    return {
      ok: false,
      issues: [{ path: "allowedDomains", message: "No se pudo derivar ningún dominio" }]
    };
  }

  const routine: Routine = {
    schemaVersion: 1,
    id: options.id ?? crypto.randomUUID(),
    name: name.trim(),
    // Seguro: ya se ha comprobado que hay al menos un dominio.
    allowedDomains: allowedDomains as [string, ...string[]],
    steps: steps.map(toStep)
  };

  const result = validateRoutine(routine);
  if (!result.ok) {
    return { ok: false, issues: result.issues };
  }
  return { ok: true, routine: result.value };
}

function deriveDomains(steps: readonly RecordedStepInput[]): string[] {
  const domains = new Set<string>();
  for (const step of steps) {
    const host = hostnameOf(step.url);
    if (host) {
      domains.add(host);
    }
  }
  return [...domains];
}

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname || undefined;
  } catch {
    return undefined;
  }
}

function toStep(step: RecordedStepInput): Step {
  const result: Step = {
    id: step.id,
    action: step.action,
    risk: "low",
    confirmationRequired: false
  };

  const target = toTarget(step.target);
  if (target) {
    result.target = target;
  }

  // Se omiten valores nulos (campos redactados como contraseñas): nunca se exportan.
  if (step.value !== undefined && step.value !== null) {
    result.value = step.value;
  }

  return result;
}

function toTarget(input: RecordedTargetInput | undefined): Target | undefined {
  if (!input) {
    return undefined;
  }
  const target: Target = {};
  if (input.role) target.role = input.role;
  if (input.accessibleName) target.accessibleName = input.accessibleName;
  if (input.label) target.label = input.label;
  if (input.testId) target.testId = input.testId;
  if (input.name) target.name = input.name;
  if (input.selectors && input.selectors.length > 0) target.selectors = [...input.selectors];
  return Object.keys(target).length > 0 ? target : undefined;
}
