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

// Origen http/https de la pestaña activa, cacheado para poder solicitar el
// permiso por sitio durante el gesto de clic sin perderlo en un await previo.
let activeOrigin: string | null = null;

startButton.addEventListener("click", () => void startRecording());
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
void refreshStatus();
void refreshActiveOrigin();
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
