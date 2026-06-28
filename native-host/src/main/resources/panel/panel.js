const state = {
  config: null
};

const SLOTS = [
  { key: "main", provider: "#sel-main-provider", model: "#sel-main-model" },
  { key: "fallback1", provider: "#sel-fb1-provider", model: "#sel-fb1-model" },
  { key: "fallback2", provider: "#sel-fb2-provider", model: "#sel-fb2-model" }
];

const els = {
  healthState: document.querySelector("#health-state"),
  serviceName: document.querySelector("#service-name"),
  healthDetail: document.querySelector("#health-detail"),
  routineCount: document.querySelector("#routine-count"),
  mainProvider: document.querySelector("#main-provider"),
  secretsExtension: document.querySelector("#secrets-extension"),
  configStatus: document.querySelector("#config-status"),
  providers: document.querySelector("#providers"),
  routineList: document.querySelector("#routine-list"),
  provider: document.querySelector("#provider"),
  model: document.querySelector("#model"),
  prompt: document.querySelector("#prompt"),
  testForm: document.querySelector("#ai-test"),
  result: document.querySelector("#test-result"),
  refresh: document.querySelector("#refresh"),
  selectionForm: document.querySelector("#selection-form"),
  selectionResult: document.querySelector("#selection-result")
};

els.refresh.addEventListener("click", () => void load());
els.provider.addEventListener("change", populateModels);
els.testForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void testModel();
});
els.selectionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void saveSelection();
});
for (const slot of SLOTS) {
  document.querySelector(slot.provider).addEventListener("change", () => populateSlotModels(slot));
}

void load();

async function load() {
  const [health, config] = await Promise.all([fetchJson("/api/health"), fetchJson("/api/ai-config")]);
  state.config = config;
  renderHealth(health);
  renderConfig(config);
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error?.message ?? `HTTP ${response.status}`);
  }
  return data;
}

function renderHealth(health) {
  els.healthState.textContent = "Operativo";
  els.healthState.classList.add("ok");
  els.serviceName.textContent = health.service;
  els.healthDetail.textContent = `${health.bind} · protocolo ${health.protocolVersion}`;
  els.routineCount.textContent = String(health.routineCount);
  els.secretsExtension.textContent = health.secretsInExtension ? "Si" : "No";
}

function renderConfig(config) {
  const main = config.selection?.main;
  els.mainProvider.textContent = main ? `${main.provider}/${main.model}` : "-";

  if (config.configError) {
    els.configStatus.textContent = `Error de configuracion: ${config.configError}`;
    els.configStatus.className = "config-status error";
  } else {
    const origin = config.configured ? "fichero local" : "catalogo por defecto";
    els.configStatus.textContent = `Origen: ${origin} · ${config.configPath}`;
    els.configStatus.className = "config-status";
  }

  els.providers.replaceChildren(...config.providers.map(renderProvider));
  populateSelectionEditor(config);
  populateProviderSelect(config.providers);
  renderRoutines(config.routines ?? []);
}

function renderProvider(provider) {
  const article = document.createElement("article");
  article.className = "provider-card";

  const header = document.createElement("header");
  const title = document.createElement("h3");
  title.textContent = provider.name;
  const badge = document.createElement("span");
  const ready = !provider.requiresSecret || provider.hasSecret;
  badge.className = ready ? "badge ready" : "badge";
  badge.textContent = !provider.requiresSecret
    ? "sin clave"
    : provider.hasSecret
      ? "clave configurada"
      : "requiere clave";
  header.append(title, badge);

  const meta = document.createElement("p");
  meta.className = "provider-meta";
  meta.textContent = provider.apiBaseUrl ? `${provider.kind} · ${provider.apiBaseUrl}` : provider.kind;

  const models = document.createElement("div");
  models.className = "model-list";
  for (const model of provider.models) {
    const item = document.createElement("span");
    item.textContent = model.name;
    models.append(item);
  }

  article.append(header, meta, models);

  if (provider.requiresSecret) {
    article.append(renderSecretForm(provider));
  }
  return article;
}

function renderSecretForm(provider) {
  const form = document.createElement("form");
  form.className = "secret-form";
  const input = document.createElement("input");
  input.type = "password";
  input.placeholder = provider.hasSecret ? "Reemplazar clave" : "Pegar clave API";
  input.autocomplete = "off";
  const save = document.createElement("button");
  save.type = "submit";
  save.textContent = "Guardar clave";
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "ghost";
  clear.textContent = "Borrar";
  const status = document.createElement("span");
  status.className = "secret-status";

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveSecret(provider.id, input.value, status);
    input.value = "";
  });
  clear.addEventListener("click", async () => {
    await saveSecret(provider.id, "", status);
    input.value = "";
  });

  form.append(input, save, clear, status);
  return form;
}

async function saveSecret(providerId, apiKey, status) {
  status.textContent = "Guardando...";
  try {
    await fetchJson("/api/ai-secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerId, apiKey })
    });
    status.textContent = apiKey ? "Clave guardada" : "Clave borrada";
    await load();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : String(error);
  }
}

function populateSelectionEditor(config) {
  for (const slot of SLOTS) {
    const providerSelect = document.querySelector(slot.provider);
    const current = config.selection?.[slot.key];
    const options = [optionEl("", slot.key === "main" ? "(obligatorio)" : "(sin fallback)")];
    for (const provider of config.providers) {
      options.push(optionEl(provider.id, provider.name, provider.id === current?.provider));
    }
    providerSelect.replaceChildren(...options);
    populateSlotModels(slot, current?.model);
  }
}

function populateSlotModels(slot, preselectModel) {
  const providerSelect = document.querySelector(slot.provider);
  const modelSelect = document.querySelector(slot.model);
  const provider = state.config?.providers.find((candidate) => candidate.id === providerSelect.value);
  const models = provider?.models ?? [];
  modelSelect.replaceChildren(
    ...models.map((model) => optionEl(model.id, model.name, model.id === preselectModel))
  );
  modelSelect.disabled = models.length === 0;
}

async function saveSelection() {
  els.selectionResult.textContent = "Guardando...";
  const selection = {};
  for (const slot of SLOTS) {
    const provider = document.querySelector(slot.provider).value;
    const model = document.querySelector(slot.model).value;
    if (provider && model) {
      selection[slot.key] = { provider, model };
    }
  }
  try {
    const config = await fetchJson("/api/ai-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selection })
    });
    state.config = config;
    renderConfig(config);
    els.selectionResult.textContent = "Seleccion guardada";
  } catch (error) {
    els.selectionResult.textContent = error instanceof Error ? error.message : String(error);
  }
}

function optionEl(value, label, selected = false) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  option.selected = selected;
  return option;
}

function populateProviderSelect(providers) {
  const selected = els.provider.value || state.config?.selection?.main?.provider;
  els.provider.replaceChildren(
    ...providers.map((provider) => optionEl(provider.id, provider.name, provider.id === selected))
  );
  populateModels();
}

function populateModels() {
  const provider = state.config?.providers.find((candidate) => candidate.id === els.provider.value);
  const activeModel = state.config?.selection?.main?.model;
  els.model.replaceChildren(
    ...(provider?.models ?? []).map((model) => optionEl(model.id, model.name, model.id === activeModel))
  );
}

function renderRoutines(routines) {
  if (routines.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Todavia no hay rutinas persistidas en el host.";
    els.routineList.replaceChildren(empty);
    return;
  }
  els.routineList.replaceChildren(
    ...routines.map((routine) => {
      const item = document.createElement("div");
      item.className = "routine-item";
      const name = document.createElement("strong");
      name.textContent = routine.name;
      const meta = document.createElement("span");
      meta.textContent = `${routine.id} · ${routine.updatedAt}`;
      item.append(name, meta);
      return item;
    })
  );
}

async function testModel() {
  els.result.textContent = "Probando...";
  try {
    const response = await fetchJson("/api/ai-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: els.provider.value,
        model: els.model.value,
        prompt: els.prompt.value
      })
    });
    els.result.textContent = JSON.stringify(response, null, 2);
  } catch (error) {
    els.result.textContent = error instanceof Error ? error.message : String(error);
  }
}
