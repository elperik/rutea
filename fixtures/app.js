// Lógica determinista del sitio de fixtures. Todo el estado deriva de una semilla
// fija (parámetro ?seed=) para que un mismo seed produzca siempre el mismo DOM.

const params = new URLSearchParams(location.search);
const seed = Number.parseInt(params.get("seed") ?? "1", 10) || 1;

document.getElementById("seed-value").textContent = String(seed);

// Generador pseudoaleatorio determinista (mulberry32).
function createRandom(seedValue) {
  let state = seedValue >>> 0;
  return function next() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = createRandom(seed);

// ID dinámico pero determinista para el botón de la sección "dinamicos".
const dynamicButton = document.getElementById("btn-dyn-placeholder");
dynamicButton.id = `btn-${seed}-${Math.floor(random() * 1e6)}`;
dynamicButton.setAttribute("data-stable-key", "accion-dinamica");

// Lista reordenable de forma determinista.
const baseItems = ["Factura", "Pedido", "Cliente", "Producto", "Informe"];
const listEl = document.getElementById("lista-items");

function renderList(items) {
  listEl.replaceChildren(
    ...items.map((label, index) => {
      const li = document.createElement("li");
      li.textContent = label;
      li.setAttribute("data-key", label.toLowerCase());
      li.setAttribute("data-pos", String(index));
      return li;
    })
  );
}

let currentItems = [...baseItems];
renderList(currentItems);

document.getElementById("reordenar").addEventListener("click", () => {
  currentItems = [currentItems[currentItems.length - 1], ...currentItems.slice(0, -1)];
  renderList(currentItems);
});

// Shadow DOM abierto con un botón interno.
const shadowHost = document.getElementById("shadow-host");
const shadowRoot = shadowHost.attachShadow({ mode: "open" });
const shadowButton = document.createElement("button");
shadowButton.textContent = "Acción dentro del shadow root";
shadowButton.setAttribute("data-testid", "shadow-action");
const shadowStatus = document.createElement("p");
shadowStatus.textContent = "Sin interacción";
shadowButton.addEventListener("click", () => {
  shadowStatus.textContent = "Pulsado en shadow DOM";
});
shadowRoot.append(shadowButton, shadowStatus);

// Navegación tipo SPA entre vistas.
const views = {
  "vista-a": document.getElementById("vista-a"),
  "vista-b": document.getElementById("vista-b")
};

function showView(id) {
  for (const [viewId, element] of Object.entries(views)) {
    const active = viewId === id;
    element.hidden = !active;
    element.setAttribute("data-active", String(active));
  }
  history.replaceState(null, "", `#${id}`);
}

for (const button of document.querySelectorAll("nav [data-view]")) {
  button.addEventListener("click", () => showView(button.getAttribute("data-view")));
}

// Modal.
const dialog = document.getElementById("dialogo");
document.getElementById("abrir-modal").addEventListener("click", () => dialog.showModal());
document.getElementById("cerrar-modal").addEventListener("click", () => dialog.close());

// Mensajes de éxito y error.
const resultMessage = document.getElementById("mensaje-resultado");
document.getElementById("provocar-exito").addEventListener("click", () => {
  resultMessage.textContent = "Operación completada con éxito";
  resultMessage.dataset.kind = "success";
});
document.getElementById("provocar-error").addEventListener("click", () => {
  resultMessage.textContent = "Se ha producido un error";
  resultMessage.dataset.kind = "error";
});

// Acción irreversible simulada (no borra nada real).
document.getElementById("borrar-todo").addEventListener("click", () => {
  document.getElementById("irreversible-status").textContent = "Borrado simulado ejecutado";
});

// El formulario nunca navega ni envía datos.
document.getElementById("form-consulta").addEventListener("submit", (event) => {
  event.preventDefault();
  resultMessage.textContent = "Formulario validado localmente";
  resultMessage.dataset.kind = "success";
});

// Restaura la vista indicada en el hash al cargar.
const initialView = location.hash.replace("#", "");
if (initialView in views) {
  showView(initialView);
}
