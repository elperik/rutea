import {
  PROTOCOL_VERSION,
  validateHelloResult,
  validateNativeMessage,
  validateNativeResponse,
  withinSizeLimit,
  type NativeMessage
} from "../contracts/index.js";

type RuteaMessage =
  | { type: "START_RECORDING" }
  | { type: "STOP_RECORDING" }
  | { type: "CLEAR_RECORDING" }
  | { type: "GET_STATUS" }
  | { type: "PING_NATIVE_HOST" }
  | { type: "RUTEA_IS_RECORDING" };

interface RuteaResponse {
  ok: boolean;
  error?: string;
  data?: unknown;
}

const NATIVE_HOST_NAME = "es.etic.rutea";
const STORAGE_KEY = "rutea.recordedSteps";
const SESSION_KEY = "rutea.recordingSessions";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener(
  (message: RuteaMessage, sender: chrome.runtime.MessageSender, sendResponse) => {
    void handleMessage(message, sender)
      .then(sendResponse)
      .catch((error: unknown) => {
        sendResponse({ ok: false, error: toErrorMessage(error) } satisfies RuteaResponse);
      });

    return true;
  }
);

async function handleMessage(
  message: RuteaMessage,
  sender: chrome.runtime.MessageSender
): Promise<RuteaResponse> {
  switch (message.type) {
    case "START_RECORDING":
      return startRecording();
    case "STOP_RECORDING":
      return stopRecording();
    case "CLEAR_RECORDING":
      await chrome.storage.local.set({ [STORAGE_KEY]: [] });
      return { ok: true };
    case "GET_STATUS":
      return getStatus();
    case "RUTEA_IS_RECORDING":
      return { ok: true, data: { recording: await isTabRecording(sender.tab?.id) } };
    case "PING_NATIVE_HOST":
      return negotiateWithHost();
    default:
      return { ok: false, error: "Mensaje no soportado" };
  }
}

// Sesiones de grabación persistidas por pestaña. Sobreviven al reinicio del
// service worker (storage.session) sin exponerse a los content scripts.
async function readSessions(): Promise<Record<string, { startedAt: string }>> {
  const stored = await chrome.storage.session.get(SESSION_KEY);
  const value = stored[SESSION_KEY];
  return isRecord(value) ? (value as Record<string, { startedAt: string }>) : {};
}

async function setTabRecording(tabId: number, active: boolean): Promise<void> {
  const sessions = await readSessions();
  if (active) {
    sessions[String(tabId)] = { startedAt: new Date().toISOString() };
  } else {
    delete sessions[String(tabId)];
  }
  await chrome.storage.session.set({ [SESSION_KEY]: sessions });
}

async function isTabRecording(tabId: number | undefined): Promise<boolean> {
  if (tabId === undefined) {
    return false;
  }
  const sessions = await readSessions();
  return Object.prototype.hasOwnProperty.call(sessions, String(tabId));
}

async function getStatus(): Promise<RuteaResponse> {
  const tab = await getActiveTab();
  return { ok: true, data: { recording: await isTabRecording(tab.id) } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function startRecording(): Promise<RuteaResponse> {
  const tab = await getActiveTab();
  if (tab.id === undefined) {
    return { ok: false, error: "La pestaña activa no tiene identificador" };
  }

  await setTabRecording(tab.id, true);

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content/recorder.js"]
  });

  await chrome.tabs.sendMessage(tab.id, { type: "RUTEA_START_RECORDING" });
  return { ok: true };
}

async function stopRecording(): Promise<RuteaResponse> {
  const tab = await getActiveTab();
  if (tab.id === undefined) {
    return { ok: false, error: "La pestaña activa no tiene identificador" };
  }

  await setTabRecording(tab.id, false);

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "RUTEA_STOP_RECORDING" });
    return { ok: true };
  } catch {
    // El content script pudo desaparecer (recarga); la sesión ya quedó cerrada.
    return { ok: true };
  }
}

async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab) {
    throw new Error("No se ha encontrado una pestaña activa");
  }
  return tab;
}

// Realiza la negociación de protocolo `hello` con el host, validando el sobre
// saliente y la respuesta entrante antes de confiar en ningún dato del host.
async function negotiateWithHost(): Promise<RuteaResponse> {
  const envelope = buildEnvelope("hello", {
    requestedProtocolVersions: [PROTOCOL_VERSION],
    capabilities: []
  });

  if (!withinSizeLimit(envelope)) {
    return { ok: false, error: "El mensaje supera el tamaño permitido" };
  }

  const outgoing = validateNativeMessage(envelope);
  if (!outgoing.ok) {
    return { ok: false, error: `Mensaje saliente inválido: ${describeIssues(outgoing.issues)}` };
  }

  const raw = await sendNativeMessage(envelope);

  const response = validateNativeResponse(raw);
  if (!response.ok) {
    return { ok: false, error: `Respuesta del host no válida: ${describeIssues(response.issues)}` };
  }
  if (!response.value.ok) {
    return { ok: false, error: response.value.error?.message ?? "El host devolvió un error" };
  }

  const hello = validateHelloResult(response.value.payload);
  if (!hello.ok) {
    return { ok: false, error: "El host no completó la negociación de protocolo" };
  }
  if (!hello.value.supportedProtocolVersions.includes(PROTOCOL_VERSION)) {
    return { ok: false, error: "El host no soporta la versión de protocolo de la extensión" };
  }

  return { ok: true, data: hello.value };
}

function buildEnvelope(type: string, payload: Record<string, unknown>): NativeMessage {
  return {
    protocolVersion: PROTOCOL_VERSION,
    messageId: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    payload,
    meta: { extensionVersion: chrome.runtime.getManifest().version }
  };
}

function sendNativeMessage(message: NativeMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendNativeMessage(NATIVE_HOST_NAME, message, (response: unknown) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message ?? "Error de Native Messaging"));
        return;
      }
      resolve(response);
    });
  });
}

function describeIssues(issues: { path: string; message: string }[]): string {
  return issues.map((issue) => `${issue.path} ${issue.message}`.trim()).join("; ");
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export {};
