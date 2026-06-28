import type { ScreenContext } from "../contracts/index.js";
import { collectSignals } from "../content/signals.js";
import { rankSelectors } from "../content/selectors.js";

type Control = ScreenContext["controls"][number];
type ActionCandidate = ScreenContext["actions"][number];
type TableContext = ScreenContext["tables"][number];
type RedactionSummary = ScreenContext["redactions"][number];
type LocatorCandidate = Control["locatorCandidates"][number];

export interface BuildScreenContextOptions {
  now?: Date;
  maxControls?: number;
  maxTables?: number;
  maxRowsPerTable?: number;
  maxTextSummaryChars?: number;
}

const DEFAULTS = {
  maxControls: 300,
  maxTables: 20,
  maxRowsPerTable: 20,
  maxTextSummaryChars: 12_000
} as const;

const REDACTED = "[REDACTED]";

export async function buildScreenContext(
  options: BuildScreenContextOptions = {}
): Promise<ScreenContext> {
  const config = { ...DEFAULTS, ...options };
  const counters = { controls: 0, actions: 0, tables: 0 };
  const redactions = new RedactionCounter();

  const controls: Control[] = [];
  const actions: ActionCandidate[] = [];
  const controlsByElement = new Map<Element, string>();

  for (const element of collectControlElements(document)) {
    if (controls.length >= config.maxControls) {
      break;
    }
    const control = describeControl(element, counters, redactions);
    if (!control) {
      continue;
    }
    controls.push(control);
    controlsByElement.set(element, control.id);
    const action = actionForControl(control, counters);
    if (action) {
      actions.push(action);
    }
  }

  const tables: TableContext[] = [];
  for (const table of Array.from(document.querySelectorAll("table"))) {
    if (tables.length >= config.maxTables) {
      break;
    }
    const context = describeTable(table, counters, controlsByElement, config.maxRowsPerTable);
    if (context) {
      tables.push(context);
    }
  }

  const textSummary = normalizeText(document.body?.innerText ?? document.body?.textContent ?? "");
  const truncatedText = textSummary.length > config.maxTextSummaryChars;
  const contextWithoutHash = {
    schemaVersion: 1 as const,
    url: location.href,
    title: normalizeText(document.title).slice(0, 500),
    capturedAt: (config.now ?? new Date()).toISOString(),
    viewport: {
      width: Math.max(1, Math.floor(window.innerWidth || document.documentElement.clientWidth || 1)),
      height: Math.max(1, Math.floor(window.innerHeight || document.documentElement.clientHeight || 1))
    },
    textSummary: redactText(textSummary.slice(0, config.maxTextSummaryChars), redactions),
    controls,
    tables,
    actions,
    redactions: redactions.toArray(),
    truncated: truncatedText || controls.length >= config.maxControls || tables.length >= config.maxTables
  };

  return {
    ...contextWithoutHash,
    contextHash: await sha256Hex(stableStringify(contextWithoutHash))
  };
}

function collectControlElements(root: ParentNode): Element[] {
  const selector = [
    "button",
    "a[href]",
    "input",
    "select",
    "textarea",
    "[role='button']",
    "[role='link']",
    "[role='checkbox']",
    "[role='radio']",
    "[role='combobox']",
    "[role='textbox']"
  ].join(",");
  return Array.from(root.querySelectorAll(selector)).filter((element) => !isIgnored(element));
}

function describeControl(
  element: Element,
  counters: { controls: number },
  redactions: RedactionCounter
): Control | undefined {
  const kind = controlKind(element);
  const visible = isVisible(element);
  const enabled = isEnabled(element);
  const label = labelFor(element);
  const text = elementText(element);
  const accessibleName = firstNonEmpty(
    element.getAttribute("aria-label"),
    element.getAttribute("title"),
    label,
    text
  );
  const candidates = locatorCandidates(element, label, accessibleName, text);

  if (candidates.length === 0) {
    return undefined;
  }

  counters.controls += 1;
  const control: Control = {
    id: `c${counters.controls}`,
    kind,
    visible,
    enabled,
    locatorCandidates: candidates as Control["locatorCandidates"]
  };

  assignIfPresent(control, "role", roleFor(element, kind));
  assignIfPresent(control, "accessibleName", accessibleName);
  assignIfPresent(control, "label", label);
  assignIfPresent(control, "text", text);
  assignIfPresent(control, "name", element.getAttribute("name"));
  assignIfPresent(control, "placeholder", element.getAttribute("placeholder"));

  const value = controlValue(element, redactions);
  if (value !== undefined) {
    control.value = value;
  }

  const options = selectOptions(element);
  if (options.length > 0) {
    control.options = options;
  }

  const state = controlState(element);
  if (Object.keys(state).length > 0) {
    control.state = state;
  }

  return control;
}

function actionForControl(
  control: Control,
  counters: { actions: number }
): ActionCandidate | undefined {
  const kind = actionKind(control);
  if (!kind) {
    return undefined;
  }
  counters.actions += 1;
  return {
    actionId: `a${counters.actions}`,
    kind,
    controlId: control.id,
    description: actionDescription(kind, control),
    risk: riskFor(control)
  };
}

function describeTable(
  table: HTMLTableElement,
  counters: { tables: number },
  controlsByElement: Map<Element, string>,
  maxRows: number
): TableContext | undefined {
  const rows = Array.from(table.rows);
  if (rows.length === 0) {
    return undefined;
  }

  const headers = Array.from(table.querySelectorAll("thead th")).map((header) =>
    normalizeText(header.textContent ?? "")
  );
  const firstRowCells = Array.from(rows[0]?.cells ?? []).map((cell) =>
    normalizeText(cell.textContent ?? "")
  );
  const columns = (headers.length > 0 ? headers : firstRowCells).filter(Boolean);
  const bodyRows = headers.length > 0 ? rows.slice(1) : rows.slice(1);
  const rowsPreview = bodyRows.slice(0, maxRows).map((row, index) => {
    const cells: Record<string, string | number | boolean | null> = {};
    Array.from(row.cells).forEach((cell, cellIndex) => {
      const key = columns[cellIndex] || `Columna ${cellIndex + 1}`;
      cells[key] = normalizeText(cell.textContent ?? "");
    });
    const actionIds = Array.from(row.querySelectorAll("button,a[href],input,select,textarea"))
      .map((element) => controlsByElement.get(element))
      .filter((id): id is string => id !== undefined);
    return {
      rowId: `r${index + 1}`,
      cells,
      ...(actionIds.length > 0 ? { actionIds } : {})
    };
  });

  counters.tables += 1;
  return {
    id: `t${counters.tables}`,
    label: tableLabel(table),
    columns,
    rowsPreview,
    rowCountVisible: Math.max(0, rows.length - 1),
    truncated: bodyRows.length > maxRows
  };
}

function controlKind(element: Element): Control["kind"] {
  if (element instanceof HTMLButtonElement || element.getAttribute("role") === "button") {
    return "button";
  }
  if (element instanceof HTMLAnchorElement || element.getAttribute("role") === "link") {
    return "link";
  }
  if (element instanceof HTMLSelectElement || element.getAttribute("role") === "combobox") {
    return "select";
  }
  if (element instanceof HTMLTextAreaElement) {
    return "textarea";
  }
  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox") {
      return "checkbox";
    }
    if (element.type === "radio") {
      return "radio";
    }
    if (element.type === "file") {
      return "file";
    }
    return "input";
  }
  if (element.getAttribute("role") === "checkbox") {
    return "checkbox";
  }
  if (element.getAttribute("role") === "radio") {
    return "radio";
  }
  if (element.getAttribute("role") === "textbox") {
    return "input";
  }
  return "other";
}

function actionKind(control: Control): ActionCandidate["kind"] | undefined {
  switch (control.kind) {
    case "button":
    case "link":
      return "click";
    case "input":
    case "textarea":
      return "fill";
    case "select":
      return "select";
    case "checkbox":
    case "radio":
      return "check";
    case "file":
      return "upload";
    default:
      return undefined;
  }
}

function actionDescription(kind: ActionCandidate["kind"], control: Control): string {
  const name = control.label ?? control.accessibleName ?? control.text ?? control.name ?? control.id;
  if (kind === "select") {
    return `Seleccionar ${name}`;
  }
  if (kind === "fill") {
    return `Rellenar ${name}`;
  }
  if (kind === "check") {
    return `Marcar ${name}`;
  }
  if (kind === "upload") {
    return `Subir archivo en ${name}`;
  }
  return `Pulsar ${name}`;
}

function riskFor(control: Control): ActionCandidate["risk"] {
  const text = normalizeText(
    [control.accessibleName, control.label, control.text, control.name].filter(Boolean).join(" ")
  ).toLowerCase();
  if (/\b(firmar|enviar|borrar|eliminar|pagar|comprar|facturar|publicar)\b/u.test(text)) {
    return text.includes("firmar") || text.includes("borrar") || text.includes("eliminar")
      ? "irreversible"
      : "high";
  }
  return "low";
}

function roleFor(element: Element, kind: Control["kind"]): string | undefined {
  return (
    element.getAttribute("role") ??
    (kind === "button"
      ? "button"
      : kind === "link"
        ? "link"
        : kind === "select"
          ? "combobox"
          : kind === "checkbox"
            ? "checkbox"
            : kind === "radio"
              ? "radio"
              : kind === "input" || kind === "textarea"
                ? "textbox"
                : undefined)
  );
}

function labelFor(element: Element): string | undefined {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    const explicit = element.labels?.[0] ? labelElementText(element.labels[0]) : undefined;
    if (explicit) {
      return normalizeText(explicit).slice(0, 500);
    }
  }
  const id = element.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${cssEscapeAttribute(id)}"]`)?.textContent;
    if (label) {
      return normalizeText(label).slice(0, 500);
    }
  }
  const closestLabel = element.closest("label");
  return closestLabel ? labelElementText(closestLabel)?.slice(0, 500) : undefined;
}

function labelElementText(label: HTMLLabelElement): string | undefined {
  const clone = label.cloneNode(true);
  if (!(clone instanceof HTMLElement)) {
    return undefined;
  }
  Array.from(clone.querySelectorAll("input,select,textarea,button,a")).forEach((child) => {
    child.parentNode?.removeChild(child);
  });
  return normalizeText(clone.textContent ?? "") || undefined;
}

function elementText(element: Element): string | undefined {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return undefined;
  }
  return normalizeText(element.textContent ?? "").slice(0, 2000) || undefined;
}

function controlValue(element: Element, redactions: RedactionCounter): Control["value"] | undefined {
  if (element instanceof HTMLInputElement) {
    if (isSensitiveInput(element)) {
      redactions.add("password");
      return REDACTED;
    }
    if (element.type === "checkbox" || element.type === "radio") {
      return element.checked;
    }
    return redactText(element.value, redactions).slice(0, 500);
  }
  if (element instanceof HTMLTextAreaElement) {
    return redactText(element.value, redactions).slice(0, 500);
  }
  if (element instanceof HTMLSelectElement) {
    const selected = element.selectedOptions[0];
    return redactText(normalizeText(selected?.textContent ?? element.value), redactions).slice(0, 500);
  }
  return undefined;
}

function selectOptions(element: Element): string[] {
  if (!(element instanceof HTMLSelectElement)) {
    return [];
  }
  return Array.from(element.options)
    .map((option) => normalizeText(option.textContent ?? option.value).slice(0, 500))
    .filter(Boolean)
    .slice(0, 500);
}

function controlState(element: Element): NonNullable<Control["state"]> {
  const state: NonNullable<Control["state"]> = {};
  if (element instanceof HTMLInputElement) {
    if (element.type === "checkbox" || element.type === "radio") {
      state.checked = element.checked;
    }
    state.required = element.required;
    state.readonly = element.readOnly;
  }
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    state.required = element.required;
  }
  if (element instanceof HTMLTextAreaElement) {
    state.readonly = element.readOnly;
  }
  const expanded = element.getAttribute("aria-expanded");
  if (expanded === "true" || expanded === "false") {
    state.expanded = expanded === "true";
  }
  return state;
}

function locatorCandidates(
  element: Element,
  label: string | undefined,
  accessibleName: string | undefined,
  text: string | undefined
): LocatorCandidate[] {
  const candidates: LocatorCandidate[] = [];
  const role = roleFor(element, controlKind(element));
  if (role && accessibleName) {
    candidates.push({ kind: "role", value: role, name: accessibleName });
  }
  if (label) {
    candidates.push({ kind: "label", value: label });
  }
  const signals = collectSignals(element);
  if (signals.testId) {
    candidates.push({ kind: "testId", value: signals.testId });
  }
  if (signals.name) {
    candidates.push({ kind: "name", value: signals.name });
  }
  if (text) {
    candidates.push({ kind: "text", value: text });
  }
  for (const selector of rankSelectors(signals).map((candidate) => candidate.selector)) {
    candidates.push({ kind: "css", value: selector });
  }
  return dedupeLocators(candidates).slice(0, 10);
}

function dedupeLocators(candidates: LocatorCandidate[]): LocatorCandidate[] {
  const seen = new Set<string>();
  const result: LocatorCandidate[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.kind}:${candidate.value}:${candidate.name ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(candidate);
    }
  }
  return result;
}

function tableLabel(table: HTMLTableElement): string | undefined {
  const caption = normalizeText(table.caption?.textContent ?? "");
  if (caption) {
    return caption.slice(0, 500);
  }
  const aria = table.getAttribute("aria-label");
  if (aria) {
    return normalizeText(aria).slice(0, 500);
  }
  return undefined;
}

function isIgnored(element: Element): boolean {
  return (
    element.getAttribute("aria-hidden") === "true" ||
    element.closest("[hidden]") !== null ||
    element.closest("[data-rutea-ignore='true']") !== null
  );
}

function isVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return true;
  }
  if (element.hidden || element.getAttribute("aria-hidden") === "true") {
    return false;
  }
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
}

function isEnabled(element: Element): boolean {
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  ) {
    return !element.disabled;
  }
  return element.getAttribute("aria-disabled") !== "true";
}

function isSensitiveInput(element: HTMLInputElement): boolean {
  return (
    element.type === "password" ||
    element.getAttribute("data-rutea-sensitive") === "true" ||
    element.autocomplete === "current-password" ||
    element.autocomplete === "new-password"
  );
}

function redactText(value: string, redactions: RedactionCounter): string {
  let result = value;
  result = replaceAndCount(result, /\bBearer\s+[A-Za-z0-9._~+/=-]+\b/g, "authorization", redactions);
  result = replaceAndCount(result, /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "email", redactions);
  result = replaceAndCount(result, /\b\d{8}[A-Za-z]\b/g, "dni", redactions);
  result = replaceAndCount(result, /\b[A-HJNP-SUVW]\d{7}[0-9A-J]\b/gi, "nif", redactions);
  result = replaceAndCount(result, /\b(?:\+34\s*)?(?:[679]\d{2}[\s.-]?\d{3}[\s.-]?\d{3})\b/g, "phone", redactions);
  result = replaceAndCount(result, /\b(?:token|api[_-]?key|sessionid|cookie)=["']?[^"'\s;]+/gi, "token", redactions);
  return result;
}

function replaceAndCount(
  value: string,
  pattern: RegExp,
  kind: RedactionSummary["kind"],
  redactions: RedactionCounter
): string {
  return value.replace(pattern, () => {
    redactions.add(kind);
    return REDACTED;
  });
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const normalized = normalizeText(value ?? "");
    if (normalized) {
      return normalized.slice(0, 500);
    }
  }
  return undefined;
}

function assignIfPresent<T extends object, K extends keyof T>(
  object: T,
  key: K,
  value: T[K] | null | undefined
): void {
  if (value !== undefined && value !== null && value !== "") {
    object[key] = value;
  }
}

function cssEscapeAttribute(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

class RedactionCounter {
  private readonly counts = new Map<RedactionSummary["kind"], number>();

  add(kind: RedactionSummary["kind"]): void {
    this.counts.set(kind, (this.counts.get(kind) ?? 0) + 1);
  }

  toArray(): RedactionSummary[] {
    return Array.from(this.counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kind, count]) => ({ kind, count }));
  }
}
