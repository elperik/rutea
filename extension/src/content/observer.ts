// Adaptador de observacion: expone ScreenContext desde la pagina activa.
// El nucleo vive en assist/screen-context.ts para poder probarlo sin chrome.

import { buildScreenContext } from "../assist/screen-context.js";

interface ObserveMessage {
  type?: string;
}

(() => {
  type RuteaWindow = Window & { __ruteaObserverInstalled?: boolean };
  const ruteaWindow = window as RuteaWindow;
  if (ruteaWindow.__ruteaObserverInstalled) {
    return;
  }
  ruteaWindow.__ruteaObserverInstalled = true;

  chrome.runtime.onMessage.addListener((message: ObserveMessage, _sender, sendResponse) => {
    if (message.type !== "RUTEA_OBSERVE_SCREEN") {
      return;
    }
    buildScreenContext()
      .then((screenContext) => sendResponse({ ok: true, screenContext }))
      .catch((error: unknown) =>
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      );
    return true;
  });
})();
