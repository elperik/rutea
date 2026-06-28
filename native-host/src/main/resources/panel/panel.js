const state = {
  config: null
};

const els = {
  healthState: document.querySelector("#health-state"),
  serviceName: document.querySelector("#service-name"),
  healthDetail: document.querySelector("#health-detail"),
  routineCount: document.querySelector("#routine-count"),
  mainProvider: document.querySelector("#main-provider"),
  secretsExtension: document.querySelector("#secrets-extension"),
  providers: document.querySelector("#providers"),
  routineList: document.querySelector("#routine-list"),
  provider: document.querySelector("#provider"),
  model: document.querySelector("#model"),
  prompt: document.querySelector("#prompt"),
  testForm: document.querySelector("#ai-test"),
  result: document.querySelector("#test-result"),
  refresh: document.querySelector("#refresh")
};

els.refresh.addEventListener("click", () => void load());
els.provider.addEventListener("change", populateModels);
els.testForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void testModel();
});

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
  const main = config.active?.main;
  els.mainProvider.textContent = main ? `${main.provider}/${main.model}` : "-";
  els.providers.replaceChildren(...config.providers.map(renderProvider));
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
  badge.className = provider.requiresSecret ? "badge" : "badge ready";
  badge.textContent = provider.requiresSecret ? "requiere clave" : "listo";
  header.append(title, badge);

  const description = document.createElement("p");
  description.textContent = provider.description;

  const models = document.createElement("div");
  models.className = "model-list";
  for (const model of provider.models) {
    const item = document.createElement("span");
    item.textContent = model.name;
    models.append(item);
  }

  article.append(header, description, models);
  return article;
}

function populateProviderSelect(providers) {
  const selected = els.provider.value;
  els.provider.replaceChildren(
    ...providers.map((provider) => {
      const option = document.createElement("option");
      option.value = provider.id;
      option.textContent = provider.name;
      option.selected = provider.id === selected || provider.id === state.config?.active?.main?.provider;
      return option;
    })
  );
  populateModels();
}

function populateModels() {
  const provider = state.config?.providers.find((candidate) => candidate.id === els.provider.value);
  const activeModel = state.config?.active?.main?.model;
  els.model.replaceChildren(
    ...(provider?.models ?? []).map((model) => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      option.selected = model.id === activeModel;
      return option;
    })
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
