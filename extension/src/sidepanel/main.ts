import { buildRoutineFromRecording, type RecordedStepInput } from "../routines/build.js";
import { parseRoutineDocument, serializeRoutineExport } from "../routines/io.js";
import { deleteRoutine, listRoutines, saveRoutine } from "../routines/library.js";
import { moveStep, removeStep, renameRoutine, updateStep } from "../routines/edit.js";
import {
  extractVariable,
  isReference,
  removeVariable,
  setVariableSecret,
  updateVariableDefault
} from "../routines/variables.js";
import { validateRoutine, type Routine, type Step, type Variable } from "../contracts/index.js";

interface CommandResponse {
  ok: boolean;
  error?: string;
  data?: unknown;
}

const STORAGE_KEY = "rutea.recordedSteps";

const startButton = getButton("start");
const stopButton = getButton("stop");
const clearButton = getButton("clear");
const pingHostButton = getButton("ping-host");
const statusElement = getElement("status");
const stepsElement = getElement("steps");
const stepCountElement = getElement("step-count");
const saveRoutineButton = getButton("save-routine");
const importInput = getInput("import-routine");
const routinesElement = getElement("routines");
const routineCountElement = getElement("routine-count");
const editorSection = getElement("editor");
const editorName = getInput("editor-name");
const editorSteps = getElement("editor-steps");
const editorVariables = getElement("editor-variables");
const editorSaveButton = getButton("editor-save");
const editorCloseButton = getButton("editor-close");

const RISKS: Step["risk"][] = ["low", "medium", "high", "irreversible"];

// Borrador de la rutina en edición; null si el editor está cerrado.
let draft: Routine | null = null;

// Origen http/https de la pestaña activa, cacheado para poder solicitar el
// permiso por sitio durante el gesto de clic sin perderlo en un await previo.
let activeOrigin: string | null = null;

startButton.addEventListener("click", () => void startRecording());
stopButton.addEventListener("click", () => runCommand("STOP_RECORDING", "Grabación detenida"));
clearButton.addEventListener("click", () => runCommand("CLEAR_RECORDING", "Pasos eliminados"));
saveRoutineButton.addEventListener("click", () => void saveCurrentRecording());
importInput.addEventListener("change", (event) => void importFromFile(event));
editorName.addEventListener("input", () => {
  if (draft) {
    draft = renameRoutine(draft, editorName.value);
  }
});
editorSaveButton.addEventListener("click", () => void saveDraft());
editorCloseButton.addEventListener("click", closeEditor);
pingHostButton.addEventListener("click", () =>
  runCommand("PING_NATIVE_HOST", "Host Java conectado")
);

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
    activeOrigin = url && /^https?:/.test(url) ? `${new URL(url).origin}/*` : null;
  } catch {
    activeOrigin = null;
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

  const editButton = document.createElement("button");
  editButton.type = "button";
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

  item.append(title, editButton, exportButton, deleteButton);
  return item;
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

function targetSummary(step: Step): string {
  return step.target?.selectors?.[0] ?? step.target?.accessibleName ?? step.target?.label ?? "—";
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
