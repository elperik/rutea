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

startButton.addEventListener("click", () => runCommand("START_RECORDING", "Grabando"));
stopButton.addEventListener("click", () => runCommand("STOP_RECORDING", "Grabación detenida"));
clearButton.addEventListener("click", () => runCommand("CLEAR_RECORDING", "Pasos eliminados"));
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

async function runCommand(type: string, successMessage: string): Promise<void> {
  setStatus("Procesando…");

  try {
    const response = (await chrome.runtime.sendMessage({ type })) as CommandResponse;
    if (!response?.ok) {
      throw new Error(response?.error ?? "La operación no se ha completado");
    }

    setStatus(successMessage);
    await refreshSteps();
  } catch (error: unknown) {
    setStatus(error instanceof Error ? error.message : String(error), true);
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
