import { buildRoutineFromRecording, type RecordedStepInput } from "../routines/build.js";
import { parseRoutineDocument, serializeRoutineExport } from "../routines/io.js";
import { deleteRoutine, listRoutines, saveRoutine } from "../routines/library.js";
import { moveStep, removeStep, renameRoutine, updateStep } from "../routines/edit.js";
import {
  extractVariable,
  isReference,
  removeVariable,
  resolveInputs,
  resolveStepValue,
  setVariableSecret,
  updateVariableDefault
} from "../routines/variables.js";
import {
  createExecution,
  currentStep,
  isTerminal,
  reduce,
  type ExecutionState
} from "../executor/execution.js";
import { validateRoutine, type Routine, type Step, type Variable } from "../contracts/index.js";

interface StepOutcomeResponse {
  ok?: boolean;
  selectorUsed?: string;
  error?: string;
}

interface CommandResponse {
  ok: boolean;
  error?: string;
  data?: unknown;
}

const STORAGE_KEY = "rutea.recordedSteps";
const CONTROL_PANEL_URL = "http://127.0.0.1:8765/";

const startButton = getButton("start");
const stopButton = getButton("stop");
const clearButton = getButton("clear");
const pingHostButton = getButton("ping-host");
const openControlPanelButton = getButton("open-control-panel");
const statusElement = getElement("status");
const stepsElement = getElement("steps");
const stepCountElement = getElement("step-count");
const addAssistRecordingButton = getButton("add-assist-recording");
const saveRoutineButton = getButton("save-routine");
const importInput = getInput("import-routine");
const routinesElement = getElement("routines");
const routineCountElement = getElement("routine-count");
const editorSection = getElement("editor");
const editorName = getInput("editor-name");
const editorSteps = getElement("editor-steps");
const editorVariables = getElement("editor-variables");
const editorAddAssistButton = getButton("editor-add-assist");
const editorSaveButton = getButton("editor-save");
const editorCloseButton = getButton("editor-close");

const RISKS: Step["risk"][] = ["low", "medium", "high", "irreversible"];
const ASSIST_STRATEGIES: NonNullable<Step["strategy"]>[] = ["auto", "structured", "computer"];
const OBSERVATION_MODES: NonNullable<Step["observationMode"]>[] = [
  "semantic-first",
  "semantic",
  "visual"
];
const DEFAULT_ASSIST_ALLOWED_ACTIONS: NonNullable<Step["allowedActions"]> = [
  "click",
  "fill",
  "select",
  "check",
  "wait",
  "assert"
];

// Borrador de la rutina en edición; null si el editor está cerrado.
let draft: Routine | null = null;

// Origen http/https de la pestaña activa, cacheado para poder solicitar el
// permiso por sitio durante el gesto de clic sin perderlo en un await previo.
let activeOrigin: string | null = null;
let activeHostname: string | null = null;
let activeUrl: string | null = null;

startButton.addEventListener("click", () => void startRecording());
stopButton.addEventListener("click", () => runCommand("STOP_RECORDING", "Grabación detenida"));
clearButton.addEventListener("click", () => runCommand("CLEAR_RECORDING", "Pasos eliminados"));
addAssistRecordingButton.addEventListener("click", () => void addAssistToRecording());
saveRoutineButton.addEventListener("click", () => void saveCurrentRecording());
importInput.addEventListener("change", (event) => void importFromFile(event));
editorName.addEventListener("input", () => {
  if (draft) {
    draft = renameRoutine(draft, editorName.value);
  }
});
editorAddAssistButton.addEventListener("click", () => addAssistToDraft());
editorSaveButton.addEventListener("click", () => void saveDraft());
editorCloseButton.addEventListener("click", closeEditor);
pingHostButton.addEventListener("click", () =>
  runCommand("PING_NATIVE_HOST", "Host Java conectado")
);
openControlPanelButton.addEventListener("click", () => {
  void chrome.tabs.create({ url: CONTROL_PANEL_URL });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  const change = changes[STORAGE_KEY];
  if (areaName === "local" && change) {
    renderSteps(change.newValue);
  }
});

void refreshSteps();
void refreshStatus();
void refreshActiveOrigin();
void refreshRoutines();
chrome.tabs.onActivated.addListener(() => void refreshActiveOrigin());
chrome.tabs.onUpdated.addListener(() => void refreshActiveOrigin());

// Inicia la grabación pidiendo, si hace falta, permiso de host solo para el
// origen de la pestaña activa (permisos opcionales por sitio, doc 005).
async function startRecording(): Promise<void> {
  if (!activeOrigin) {
    setStatus("Solo se puede grabar en páginas http o https", true);
    return;
  }

  let granted: boolean;
  try {
    granted = await chrome.permissions.request({ origins: [activeOrigin] });
  } catch {
    setStatus("No se pudo solicitar permiso para esta página", true);
    return;
  }

  if (!granted) {
    setStatus("Permiso denegado para esta página", true);
    return;
  }

  await runCommand("START_RECORDING", "Grabando");
}

async function refreshActiveOrigin(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url;
    if (url && /^https?:/.test(url)) {
      const parsed = new URL(url);
      activeOrigin = `${parsed.origin}/*`;
      activeHostname = parsed.hostname;
      activeUrl = url;
    } else {
      activeOrigin = null;
      activeHostname = null;
      activeUrl = null;
    }
  } catch {
    activeOrigin = null;
    activeHostname = null;
    activeUrl = null;
  }
}

async function runCommand(type: string, successMessage: string): Promise<void> {
  setStatus("Procesando…");

  try {
    const response = (await chrome.runtime.sendMessage({ type })) as CommandResponse;
    if (!response?.ok) {
      throw new Error(response?.error ?? "La operación no se ha completado");
    }

    setStatus(successMessage);
    await refreshSteps();
    await refreshStatus();
  } catch (error: unknown) {
    setStatus(error instanceof Error ? error.message : String(error), true);
  }
}

// Refleja si la pestaña activa está grabando, según el estado persistido.
async function refreshStatus(): Promise<void> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: "GET_STATUS"
    })) as CommandResponse & { data?: { recording?: boolean } };
    const recording = response?.ok === true && response.data?.recording === true;
    startButton.disabled = recording;
    stopButton.disabled = !recording;
    if (recording) {
      setStatus("Grabando");
    }
  } catch {
    // Sin estado disponible: se deja la UI como esté.
  }
}

async function refreshSteps(): Promise<void> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  renderSteps(stored[STORAGE_KEY]);
}

function renderSteps(value: unknown): void {
  const steps = Array.isArray(value) ? value : [];
  stepCountElement.textContent = String(steps.length);
  stepsElement.textContent = JSON.stringify(steps, null, 2);
}

function setStatus(message: string, isError = false): void {
  statusElement.textContent = message;
  statusElement.setAttribute("aria-label", isError ? `Error: ${message}` : message);
}

async function addAssistToRecording(): Promise<void> {
  if (!activeUrl) {
    setStatus("Abre primero una pagina http/https para insertar una instruccion IA", true);
    return;
  }

  const instruction = window.prompt("Instruccion para la IA");
  if (instruction === null) {
    return;
  }

  const step = createAssistRecordedStep(instruction, activeUrl);
  const issue = validateAssistInstruction(step);
  if (issue) {
    setStatus(issue, true);
    return;
  }

  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const steps = Array.isArray(stored[STORAGE_KEY])
    ? (stored[STORAGE_KEY] as RecordedStepInput[])
    : [];
  await chrome.storage.local.set({ [STORAGE_KEY]: [...steps, step] });
  setStatus("Instruccion IA anadida a la grabacion");
  await refreshSteps();
}

// Convierte la grabación actual en una rutina validada y la guarda.
async function saveCurrentRecording(): Promise<void> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const steps = Array.isArray(stored[STORAGE_KEY])
    ? (stored[STORAGE_KEY] as RecordedStepInput[])
    : [];
  if (steps.length === 0) {
    setStatus("No hay pasos grabados que guardar", true);
    return;
  }

  const name = window.prompt("Nombre de la rutina");
  if (name === null) {
    return;
  }

  const result = buildRoutineFromRecording(name, steps);
  if (!result.ok) {
    setStatus(
      `No se pudo crear la rutina: ${result.issues.map((i) => i.message).join("; ")}`,
      true
    );
    return;
  }

  await saveRoutine(result.routine);
  setStatus("Rutina guardada");
  await refreshRoutines();
}

async function refreshRoutines(): Promise<void> {
  const routines = await listRoutines();
  routineCountElement.textContent = String(routines.length);
  routinesElement.replaceChildren(...routines.map(renderRoutineItem));
}

function renderRoutineItem(routine: Routine): HTMLLIElement {
  const item = document.createElement("li");

  const title = document.createElement("span");
  title.textContent = `${routine.name} · ${routine.steps.length} pasos`;

  const runButton = document.createElement("button");
  runButton.type = "button";
  runButton.textContent = "Ejecutar";
  runButton.addEventListener("click", () => void executeRoutine(routine));

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "secondary";
  editButton.textContent = "Editar";
  editButton.addEventListener("click", () => openEditor(routine));

  const exportButton = document.createElement("button");
  exportButton.type = "button";
  exportButton.className = "secondary";
  exportButton.textContent = "Exportar";
  exportButton.addEventListener("click", () => void exportRoutine(routine));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "danger";
  deleteButton.textContent = "Eliminar";
  deleteButton.addEventListener("click", () => void removeRoutine(routine.id));

  item.append(title, runButton, editButton, exportButton, deleteButton);
  return item;
}

// --- Ejecución supervisada ----------------------------------------------------

async function executeRoutine(routine: Routine): Promise<void> {
  if (!activeOrigin || !activeHostname) {
    setStatus("Abre primero una página http/https para ejecutar", true);
    return;
  }

  // El permiso debe pedirse en el gesto, sin await previo que lo invalide.
  let granted: boolean;
  try {
    granted = await chrome.permissions.request({ origins: [activeOrigin] });
  } catch {
    setStatus("No se pudo solicitar permiso para esta página", true);
    return;
  }
  if (!granted) {
    setStatus("Permiso denegado para esta página", true);
    return;
  }

  if (!routine.allowedDomains.includes(activeHostname)) {
    setStatus(`El dominio activo (${activeHostname}) no está autorizado para esta rutina`, true);
    return;
  }

  const inputs = resolveInputs(routine);
  let state = reduce(routine, createExecution("supervised"), { type: "start" });
  setExecStatus(routine, state);

  while (!isTerminal(state.status)) {
    if (state.status === "waiting_for_confirmation") {
      const step = currentStep(routine, state);
      const summary = step ? `${step.action} · ${targetSummary(step)}` : "";
      const confirmed = window.confirm(`Confirmar paso ${state.index + 1}: ${summary}`);
      state = reduce(routine, state, { type: confirmed ? "confirm" : "cancel" });
      continue;
    }

    if (state.status === "running") {
      const step = currentStep(routine, state);
      if (!step) {
        break;
      }
      const resolved = resolveStepValue(step.value, inputs);
      if (!resolved.resolved) {
        state = reduce(routine, state, {
          type: "stepFailed",
          error: `Variable sin valor: ${resolved.name}`
        });
        setExecStatus(routine, state);
        continue;
      }

      const response = (await chrome.runtime.sendMessage({
        type: "EXECUTE_STEP",
        step,
        value: resolved.value
      })) as { ok?: boolean; data?: StepOutcomeResponse; error?: string };

      const outcome: StepOutcomeResponse = response?.ok
        ? (response.data ?? { ok: false, error: "Sin respuesta del player" })
        : { ok: false, error: response?.error ?? "Fallo de ejecución" };

      state = reduce(
        routine,
        state,
        outcome.ok
          ? { type: "stepCompleted", selectorUsed: outcome.selectorUsed }
          : { type: "stepFailed", error: outcome.error ?? "Fallo de ejecución" }
      );
      setExecStatus(routine, state);
    }
  }

  setExecStatus(routine, state, true);
}

function setExecStatus(routine: Routine, state: ExecutionState, final = false): void {
  const total = routine.steps.length;
  const done = state.results.length;
  if (final) {
    const failed = state.results.find((result) => result.status === "failed");
    const label =
      state.status === "completed"
        ? `Ejecución completada (${done}/${total})`
        : state.status === "cancelled"
          ? `Ejecución cancelada (${done}/${total})`
          : `Ejecución fallida en el paso ${done}: ${failed?.error ?? ""}`;
    setStatus(label, state.status !== "completed");
    return;
  }
  setStatus(`Ejecutando ${routine.name}: paso ${Math.min(state.index + 1, total)}/${total}`);
}

// --- Editor de rutina ---------------------------------------------------------

function openEditor(routine: Routine): void {
  draft = structuredClone(routine);
  editorName.value = draft.name;
  editorSection.hidden = false;
  renderDraft();
  editorSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeEditor(): void {
  draft = null;
  editorSection.hidden = true;
  editorSteps.replaceChildren();
  editorVariables.replaceChildren();
}

function renderDraft(): void {
  if (!draft) {
    return;
  }
  editorSteps.replaceChildren(...draft.steps.map((step, index) => renderDraftStep(step, index)));
  editorVariables.replaceChildren(
    ...(draft.variables ?? []).map((variable) => renderDraftVariable(variable))
  );
}

function renderDraftStep(step: Step, index: number): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "editor-step";

  const heading = document.createElement("p");
  heading.className = "editor-step-heading";
  heading.textContent = `${index + 1}. ${step.action} · ${targetSummary(step)}`;

  const controls = document.createElement("div");
  controls.className = "editor-step-controls";

  controls.append(
    riskControl(step, index),
    confirmationControl(step, index),
    timeoutControl(step, index)
  );

  const order = document.createElement("div");
  order.className = "editor-step-order";
  order.append(
    orderButton("↑", () => applyEdit(moveStep(draft!, index, -1))),
    orderButton("↓", () => applyEdit(moveStep(draft!, index, 1))),
    dangerButton("Eliminar", () => applyEdit(removeStep(draft!, index)))
  );

  item.append(heading, controls, order);

  if (step.action === "assist") {
    item.append(assistControls(step, index));
  }

  if (step.value !== undefined && step.value !== null && !isReference(step.value)) {
    const convert = orderButton("→ Variable", () => convertStepToVariable(index));
    convert.classList.remove("secondary");
    item.append(convert);
  }

  return item;
}

function convertStepToVariable(index: number): void {
  if (!draft) {
    return;
  }
  const name = window.prompt("Nombre de la variable");
  if (name === null) {
    return;
  }
  const result = extractVariable(draft, index, name.trim());
  if (!result.ok) {
    setStatus(result.issues.map((issue) => issue.message).join("; "), true);
    return;
  }
  applyEdit(result.routine);
}

function renderDraftVariable(variable: Variable): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "editor-variable";

  const name = document.createElement("span");
  name.className = "editor-variable-name";
  name.textContent = `${variable.name} : ${variable.type}`;

  const defaultInput = document.createElement("input");
  defaultInput.type = "text";
  defaultInput.placeholder = "valor por defecto";
  defaultInput.value = variable.secret ? "" : String(variable.defaultValue ?? "");
  defaultInput.disabled = variable.secret;
  defaultInput.addEventListener("change", () => {
    applyEdit(updateVariableDefault(draft!, variable.name, defaultInput.value));
  });

  const secretLabel = document.createElement("label");
  const secretCheckbox = document.createElement("input");
  secretCheckbox.type = "checkbox";
  secretCheckbox.checked = variable.secret;
  secretCheckbox.addEventListener("change", () => {
    applyEdit(setVariableSecret(draft!, variable.name, secretCheckbox.checked));
  });
  secretLabel.append(secretCheckbox, document.createTextNode(" Secreto"));

  const remove = dangerButton("Eliminar", () => {
    const result = removeVariable(draft!, variable.name);
    if (!result.ok) {
      setStatus(result.issues.map((issue) => issue.message).join("; "), true);
      return;
    }
    applyEdit(result.routine);
  });

  item.append(name, defaultInput, secretLabel, remove);
  return item;
}

function riskControl(step: Step, index: number): HTMLLabelElement {
  const label = document.createElement("label");
  label.textContent = "Riesgo ";
  const select = document.createElement("select");
  for (const risk of RISKS) {
    const option = document.createElement("option");
    option.value = risk;
    option.textContent = risk;
    option.selected = step.risk === risk;
    select.append(option);
  }
  select.addEventListener("change", () => {
    applyEdit(updateStep(draft!, index, { risk: select.value as Step["risk"] }));
  });
  label.append(select);
  return label;
}

function confirmationControl(step: Step, index: number): HTMLLabelElement {
  const label = document.createElement("label");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = step.confirmationRequired;
  checkbox.addEventListener("change", () => {
    applyEdit(updateStep(draft!, index, { confirmationRequired: checkbox.checked }));
  });
  label.append(checkbox, document.createTextNode(" Confirmar"));
  return label;
}

function timeoutControl(step: Step, index: number): HTMLLabelElement {
  const label = document.createElement("label");
  label.textContent = "Timeout ";
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = "120000";
  input.placeholder = "ms";
  input.value = step.timeoutMs === undefined ? "" : String(step.timeoutMs);
  input.addEventListener("change", () => {
    const value = input.value.trim();
    const timeoutMs = value === "" ? undefined : Number(value);
    applyEdit(updateStep(draft!, index, { timeoutMs }));
  });
  label.append(input);
  return label;
}

function assistControls(step: Step, index: number): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "assist-editor";

  const instructionLabel = document.createElement("label");
  instructionLabel.className = "field";
  instructionLabel.textContent = "Instruccion IA";
  const textarea = document.createElement("textarea");
  textarea.value = step.instruction ?? "";
  textarea.maxLength = 8000;
  textarea.addEventListener("change", () => {
    applyEdit(updateStep(draft!, index, { instruction: textarea.value.trim() }));
  });
  instructionLabel.append(textarea);

  const controls = document.createElement("div");
  controls.className = "editor-step-controls";
  controls.append(
    enumControl("Estrategia", step.strategy ?? "auto", ASSIST_STRATEGIES, (value) => {
      applyEdit(updateStep(draft!, index, { strategy: value }));
    }),
    enumControl(
      "Observacion",
      step.observationMode ?? "semantic-first",
      OBSERVATION_MODES,
      (value) => {
        applyEdit(updateStep(draft!, index, { observationMode: value }));
      }
    ),
    numberControl("Iteraciones", step.maxIterations ?? 1, 1, 100, (value) => {
      applyEdit(updateStep(draft!, index, { maxIterations: value }));
    }),
    numberControl("Acciones", step.maxActions ?? 20, 1, 200, (value) => {
      applyEdit(updateStep(draft!, index, { maxActions: value }));
    }),
    numberControl("Turnos IA", step.maxModelTurns ?? 5, 1, 50, (value) => {
      applyEdit(updateStep(draft!, index, { maxModelTurns: value }));
    })
  );

  const stopLabel = document.createElement("label");
  stopLabel.className = "field";
  stopLabel.textContent = "Condicion de parada";
  const stopInput = document.createElement("input");
  stopInput.type = "text";
  stopInput.maxLength = 1000;
  stopInput.placeholder = "Obligatoria si iteraciones > 1";
  stopInput.value = step.stopCondition ?? "";
  stopInput.addEventListener("change", () => {
    const value = stopInput.value.trim();
    applyEdit(updateStep(draft!, index, { stopCondition: value === "" ? undefined : value }));
  });
  stopLabel.append(stopInput);

  container.append(instructionLabel, controls, stopLabel);
  return container;
}

function orderButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "secondary";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function dangerButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "danger";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function applyEdit(next: Routine): void {
  draft = next;
  renderDraft();
}

function addAssistToDraft(): void {
  if (!draft) {
    return;
  }

  const instruction = window.prompt("Instruccion para la IA");
  if (instruction === null) {
    return;
  }

  const step = createAssistStep(instruction);
  const issue = validateAssistInstruction(step);
  if (issue) {
    setStatus(issue, true);
    return;
  }

  applyEdit({ ...draft, steps: [...draft.steps, step] });
}

function targetSummary(step: Step): string {
  return (
    step.instruction ??
    step.target?.selectors?.[0] ??
    step.target?.accessibleName ??
    step.target?.label ??
    "-"
  );
}

async function saveDraft(): Promise<void> {
  if (!draft) {
    return;
  }
  const result = validateRoutine(draft);
  if (!result.ok) {
    setStatus(
      `No se puede guardar: ${result.issues.map((i) => `${i.path} ${i.message}`.trim()).join("; ")}`,
      true
    );
    return;
  }
  await saveRoutine(result.value);
  setStatus("Cambios guardados");
  closeEditor();
  await refreshRoutines();
}

async function exportRoutine(routine: Routine): Promise<void> {
  const blob = new Blob([await serializeRoutineExport(routine)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizeFileName(routine.name)}.rutea.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function removeRoutine(id: string): Promise<void> {
  await deleteRoutine(id);
  setStatus("Rutina eliminada");
  await refreshRoutines();
}

async function importFromFile(event: Event): Promise<void> {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) {
    return;
  }
  const file = input.files?.[0];
  input.value = "";
  if (!file) {
    return;
  }

  const result = await parseRoutineDocument(await file.text());
  if (!result.ok) {
    setStatus(
      `Importación rechazada: ${result.issues.map((i) => `${i.path} ${i.message}`.trim()).join("; ")}`,
      true
    );
    return;
  }

  await saveRoutine(result.routine);
  setStatus(
    result.verified
      ? "Rutina importada (integridad verificada)"
      : "Rutina importada (sin verificar)"
  );
  await refreshRoutines();
}

function createAssistRecordedStep(instruction: string, url: string): RecordedStepInput {
  const step = createAssistStep(instruction);
  return {
    id: step.id,
    action: "assist",
    url,
    strategy: step.strategy,
    observationMode: step.observationMode,
    instruction: step.instruction,
    allowedActions: step.allowedActions,
    maxModelTurns: step.maxModelTurns,
    maxActions: step.maxActions,
    maxIterations: step.maxIterations,
    maxInputBytes: step.maxInputBytes,
    maxScreenshotCount: step.maxScreenshotCount,
    maxDurationMs: step.maxDurationMs
  };
}

function createAssistStep(instruction: string): Step {
  return {
    id: crypto.randomUUID(),
    action: "assist",
    strategy: "auto",
    observationMode: "semantic-first",
    instruction: instruction.trim(),
    allowedActions: [...DEFAULT_ASSIST_ALLOWED_ACTIONS],
    maxModelTurns: 5,
    maxActions: 20,
    maxIterations: 1,
    maxInputBytes: 65_536,
    maxScreenshotCount: 0,
    maxDurationMs: 60_000,
    risk: "medium",
    confirmationRequired: true
  };
}

function validateAssistInstruction(step: Pick<Step, "instruction">): string | undefined {
  const instruction = step.instruction?.trim() ?? "";
  if (instruction.length === 0) {
    return "La instruccion IA no puede estar vacia";
  }
  if (instruction.length > 8000) {
    return "La instruccion IA supera el limite de 8000 caracteres";
  }
  return undefined;
}

function enumControl<T extends string>(
  text: string,
  value: T,
  values: readonly T[],
  onChange: (value: T) => void
): HTMLLabelElement {
  const label = document.createElement("label");
  label.textContent = `${text} `;
  const select = document.createElement("select");
  for (const optionValue of values) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionValue;
    option.selected = optionValue === value;
    select.append(option);
  }
  select.addEventListener("change", () => onChange(select.value as T));
  label.append(select);
  return label;
}

function numberControl(
  text: string,
  value: number,
  min: number,
  max: number,
  onChange: (value: number) => void
): HTMLLabelElement {
  const label = document.createElement("label");
  label.textContent = `${text} `;
  const input = document.createElement("input");
  input.type = "number";
  input.min = String(min);
  input.max = String(max);
  input.value = String(value);
  input.addEventListener("change", () => {
    const parsed = Number(input.value);
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min;
    input.value = String(next);
    onChange(next);
  });
  label.append(input);
  return label;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 60) || "rutina";
}

function getInput(id: string): HTMLInputElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`No se encuentra el campo ${id}`);
  }
  return element;
}

function getButton(id: string): HTMLButtonElement {
  const element = document.getElementById(id);
  if (!(element instanceof HTMLButtonElement)) {
    throw new Error(`No se encuentra el botón ${id}`);
  }
  return element;
}

function getElement(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`No se encuentra el elemento ${id}`);
  }
  return element;
}

export {};
