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
  | { type: "PING_NATIVE_HOST" };

interface RuteaResponse {
  ok: boolean;
  error?: string;
  data?: unknown;
}

const NATIVE_HOST_NAME = "es.etic.rutea";
const STORAGE_KEY = "rutea.recordedSteps";

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message: RuteaMessage, _sender, sendResponse) => {
  void handleMessage(message)
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse({ ok: false, error: toErrorMessage(error) } satisfies RuteaResponse);
    });

  return true;
});

async function handleMessage(message: RuteaMessage): Promise<RuteaResponse> {
  switch (message.type) {
    case "START_RECORDING":
      return startRecording();
    case "STOP_RECORDING":
      return stopRecording();
    case "CLEAR_RECORDING":
      await chrome.storage.local.set({ [STORAGE_KEY]: [] });
      return { ok: true };
    case "PING_NATIVE_HOST":
      return negotiateWithHost();
    default:
      return { ok: false, error: "Mensaje no soportado" };
  }
}

async function startRecording(): Promise<RuteaResponse> {
  const tab = await getActiveTab();
  if (tab.id === undefined) {
    return { ok: false, error: "La pestaña activa no tiene identificador" };
  }

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

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "RUTEA_STOP_RECORDING" });
    return { ok: true };
  } catch {
    return { ok: false, error: "No hay un grabador activo en esta pestaña" };
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
