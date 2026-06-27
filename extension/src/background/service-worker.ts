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
      return pingNativeHost();
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

function pingNativeHost(): Promise<RuteaResponse> {
  return new Promise((resolve) => {
    chrome.runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      { type: "ping", protocolVersion: 1 },
      (response: unknown) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          resolve({ ok: false, error: runtimeError.message });
          return;
        }
        resolve({ ok: true, data: response });
      }
    );
  });
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
