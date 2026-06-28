import {
  PROTOCOL_VERSION,
  validateAiNavigationProposal,
  validateAiNavigationRequest,
  validateHelloResult,
  validateNativeMessage,
  validateNativeResponse,
  validateScreenContext,
  withinSizeLimit,
  type AiNavigationRequest,
  type NativeMessage,
  type ScreenContext,
  type Step
} from "../contracts/index.js";
import { contentScriptId, originMatchPattern } from "./origins.js";

interface RecordingSession {
  startedAt: string;
  origin?: string;
}

type RuteaMessage =
  | { type: "START_RECORDING" }
  | { type: "STOP_RECORDING" }
  | { type: "CLEAR_RECORDING" }
  | { type: "GET_STATUS" }
  | { type: "PING_NATIVE_HOST" }
  | { type: "RUTEA_IS_RECORDING" }
  | { type: "OBSERVE_SCREEN" }
  | { type: "AI_NAVIGATION_PROPOSE"; request: AiNavigationRequest }
  | { type: "EXECUTE_STEP"; step: Step; value?: unknown };

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
    case "OBSERVE_SCREEN":
      return observeScreenOnActiveTab();
    case "AI_NAVIGATION_PROPOSE":
      return proposeAiNavigation(message.request);
    case "EXECUTE_STEP":
      return executeStepOnActiveTab(message.step, message.value);
    case "PING_NATIVE_HOST":
      return negotiateWithHost();
    default:
      return { ok: false, error: "Mensaje no soportado" };
  }
}

// Sesiones de grabación persistidas por pestaña. Sobreviven al reinicio del
// service worker (storage.session) sin exponerse a los content scripts.
async function readSessions(): Promise<Record<string, RecordingSession>> {
  const stored = await chrome.storage.session.get(SESSION_KEY);
  const value = stored[SESSION_KEY];
  return isRecord(value) ? (value as Record<string, RecordingSession>) : {};
}

async function setTabRecording(tabId: number, active: boolean, origin?: string): Promise<void> {
  const sessions = await readSessions();
  if (active) {
    sessions[String(tabId)] = { startedAt: new Date().toISOString(), origin };
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

  const origin = httpOrigin(tab.url);
  await setTabRecording(tab.id, true, origin);

  // Registro dinámico: reinyecta el grabador tras navegaciones dentro del
  // origen autorizado, manteniendo la grabación entre cambios de documento.
  if (origin) {
    await registerRecorderForOrigin(origin);
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

  const sessions = await readSessions();
  const origin = sessions[String(tab.id)]?.origin;

  await setTabRecording(tab.id, false);
  if (origin) {
    await unregisterRecorderForOriginIfUnused(origin);
  }

  try {
    await chrome.tabs.sendMessage(tab.id, { type: "RUTEA_STOP_RECORDING" });
    return { ok: true };
  } catch {
    // El content script pudo desaparecer (recarga); la sesión ya quedó cerrada.
    return { ok: true };
  }
}

// Origen http/https de una URL, o undefined si no aplica.
function httpOrigin(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.origin : undefined;
  } catch {
    return undefined;
  }
}

async function registerRecorderForOrigin(origin: string): Promise<void> {
  const id = contentScriptId(origin);
  const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [id] });
  if (existing.length > 0) {
    return;
  }
  await chrome.scripting.registerContentScripts([
    {
      id,
      matches: [originMatchPattern(origin)],
      js: ["content/recorder.js"],
      runAt: "document_idle"
    }
  ]);
}

async function unregisterRecorderForOriginIfUnused(origin: string): Promise<void> {
  const sessions = await readSessions();
  const stillUsed = Object.values(sessions).some((session) => session.origin === origin);
  if (stillUsed) {
    return;
  }
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [contentScriptId(origin)] });
  } catch {
    // El script podía no estar registrado; no es un error operativo.
  }
}

// Inyecta el player en la pestaña activa y le pide ejecutar un paso, devolviendo
// el resultado al panel. La orquestación (estado, confirmaciones) vive en el panel.
async function executeStepOnActiveTab(step: Step, value: unknown): Promise<RuteaResponse> {
  const tab = await getActiveTab();
  if (tab.id === undefined) {
    return { ok: false, error: "La pestaña activa no tiene identificador" };
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/player.js"]
    });
    const outcome = await chrome.tabs.sendMessage(tab.id, {
      type: "RUTEA_EXECUTE_STEP",
      step,
      value
    });
    return { ok: true, data: outcome };
  } catch (error: unknown) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

async function observeScreenOnActiveTab(): Promise<RuteaResponse> {
  const tab = await getActiveTab();
  if (tab.id === undefined) {
    return { ok: false, error: "La pestaÃ±a activa no tiene identificador" };
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/observer.js"]
    });
    const response = (await chrome.tabs.sendMessage(tab.id, {
      type: "RUTEA_OBSERVE_SCREEN"
    })) as { ok?: boolean; screenContext?: unknown; error?: string };

    if (!response?.ok) {
      return { ok: false, error: response?.error ?? "No se pudo observar la pantalla" };
    }

    const validation = validateScreenContext(response.screenContext);
    if (!validation.ok) {
      return {
        ok: false,
        error: `ScreenContext invÃ¡lido: ${describeIssues(validation.issues)}`
      };
    }

    if (!withinSizeLimit(validation.value)) {
      return { ok: false, error: "ScreenContext supera el tamaÃ±o permitido" };
    }

    return { ok: true, data: validation.value satisfies ScreenContext };
  } catch (error: unknown) {
    return { ok: false, error: toErrorMessage(error) };
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

async function proposeAiNavigation(request: AiNavigationRequest): Promise<RuteaResponse> {
  const requestValidation = validateAiNavigationRequest(request);
  if (!requestValidation.ok) {
    return {
      ok: false,
      error: `PeticiÃ³n IA saliente invÃ¡lida: ${describeIssues(requestValidation.issues)}`
    };
  }
  if (!withinSizeLimit(requestValidation.value)) {
    return { ok: false, error: "La peticiÃ³n IA supera el tamaÃ±o permitido" };
  }

  const envelope = buildEnvelope("ai.navigation.propose", requestValidation.value);
  const outgoing = validateNativeMessage(envelope);
  if (!outgoing.ok) {
    return { ok: false, error: `Mensaje saliente invÃ¡lido: ${describeIssues(outgoing.issues)}` };
  }

  const raw = await sendNativeMessage(envelope);
  const response = validateNativeResponse(raw);
  if (!response.ok) {
    return { ok: false, error: `Respuesta del host no vÃ¡lida: ${describeIssues(response.issues)}` };
  }
  if (!response.value.ok) {
    return { ok: false, error: response.value.error?.message ?? "El host devolviÃ³ un error IA" };
  }

  const payload = isRecord(response.value.payload) ? response.value.payload : {};
  const proposal = validateAiNavigationProposal(payload.proposal);
  if (!proposal.ok) {
    return { ok: false, error: `Propuesta IA invÃ¡lida: ${describeIssues(proposal.issues)}` };
  }

  return { ok: true, data: proposal.value };
}

function buildEnvelope(type: string, payload: object): NativeMessage {
  return {
    protocolVersion: PROTOCOL_VERSION,
    messageId: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    payload: payload as NativeMessage["payload"],
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
