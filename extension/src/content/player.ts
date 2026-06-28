// Adaptador del player: conecta la mensajería de la extensión con el núcleo
// (`player-core`), que contiene la lógica DOM testeable.

import type { Step } from "../contracts/index.js";
import { executeStep } from "./player-core.js";

interface ExecuteMessage {
  type?: string;
  step?: Step;
  value?: unknown;
}

(() => {
  type RuteaWindow = Window & { __ruteaPlayerInstalled?: boolean };
  const ruteaWindow = window as RuteaWindow;
  if (ruteaWindow.__ruteaPlayerInstalled) {
    return;
  }
  ruteaWindow.__ruteaPlayerInstalled = true;

  chrome.runtime.onMessage.addListener((message: ExecuteMessage, _sender, sendResponse) => {
    if (message.type !== "RUTEA_EXECUTE_STEP" || !message.step) {
      return;
    }
    executeStep(message.step, message.value)
      .then(sendResponse)
      .catch((error: unknown) =>
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      );
    return true;
  });
})();
