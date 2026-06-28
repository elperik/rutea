package es.etic.rutea.controlpanel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import es.etic.rutea.ai.config.AiConfig;
import es.etic.rutea.ai.config.AiConfigException;
import es.etic.rutea.ai.config.AiConfigSecrets;
import es.etic.rutea.ai.config.AiConfigStore;
import es.etic.rutea.ai.config.AiModel;
import es.etic.rutea.ai.config.AiProvider;
import es.etic.rutea.ai.config.AiSelection;
import es.etic.rutea.ai.config.AiSelectionRef;
import es.etic.rutea.messaging.MessageHandler;
import es.etic.rutea.persistence.RoutineRepository;
import es.etic.rutea.persistence.RoutineSummary;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.time.Clock;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.Executors;

public final class LocalControlPanelServer implements AutoCloseable {

    public static final int DEFAULT_PORT = 8765;

    private final ObjectMapper mapper;
    private final RoutineRepository routines;
    private final AiConfigStore configStore;
    private final Clock clock;
    private final HttpServer server;

    private volatile AiConfig config;
    private volatile AiConfigSecrets secrets;
    private volatile boolean configured;
    private volatile String configError;

    public LocalControlPanelServer(
            ObjectMapper mapper,
            RoutineRepository routines,
            AiConfigStore configStore,
            Clock clock,
            int port)
            throws IOException {
        this.mapper = mapper;
        this.routines = routines;
        this.configStore = configStore;
        this.clock = clock;
        loadConfig();
        InetSocketAddress address = new InetSocketAddress(InetAddress.getLoopbackAddress(), port);
        this.server = HttpServer.create(address, 0);
        this.server.setExecutor(Executors.newVirtualThreadPerTaskExecutor());
        registerRoutes();
    }

    public URI uri() {
        return URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/");
    }

    public void start() {
        server.start();
    }

    @Override
    public void close() {
        server.stop(0);
    }

    private void loadConfig() {
        try {
            AiConfigStore.Loaded loaded = configStore.load();
            this.config = loaded.config();
            this.secrets = loaded.secrets();
            this.configured = loaded.fromFile();
            this.configError = null;
        } catch (AiConfigException exception) {
            // No bloquear el panel: degradar a catalogo por defecto y exponer el error.
            this.config = configStore.defaultConfig();
            this.secrets = AiConfigSecrets.empty();
            this.configured = false;
            this.configError = exception.getMessage();
        }
    }

    private void registerRoutes() {
        server.createContext("/", this::handleIndex);
        server.createContext("/assets/panel.css", exchange -> handleResource(exchange, "panel/panel.css", "text/css"));
        server.createContext(
                "/assets/panel.js",
                exchange -> handleResource(exchange, "panel/panel.js", "application/javascript"));
        server.createContext("/api/health", this::handleHealth);
        server.createContext("/api/ai-config", this::handleAiConfig);
        server.createContext("/api/ai-secret", this::handleAiSecret);
        server.createContext("/api/ai-test", this::handleAiTest);
    }

    private void handleIndex(HttpExchange exchange) throws IOException {
        if (!"GET".equals(exchange.getRequestMethod())) {
            sendJsonError(exchange, 405, "method_not_allowed", "Metodo no permitido");
            return;
        }
        sendResource(exchange, "panel/index.html", "text/html; charset=utf-8");
    }

    private void handleResource(HttpExchange exchange, String resource, String contentType) throws IOException {
        if (!"GET".equals(exchange.getRequestMethod())) {
            sendJsonError(exchange, 405, "method_not_allowed", "Metodo no permitido");
            return;
        }
        sendResource(exchange, resource, contentType + "; charset=utf-8");
    }

    private void handleHealth(HttpExchange exchange) throws IOException {
        if (!"GET".equals(exchange.getRequestMethod())) {
            sendJsonError(exchange, 405, "method_not_allowed", "Metodo no permitido");
            return;
        }
        ObjectNode payload = mapper.createObjectNode();
        payload.put("ok", true);
        payload.put("service", MessageHandler.SERVICE);
        payload.put("protocolVersion", MessageHandler.PROTOCOL_VERSION);
        payload.put("timestamp", clock.instant().toString());
        payload.put("bind", "127.0.0.1");
        payload.put("routineCount", routines.list().size());
        payload.put("secretsInExtension", false);
        sendJson(exchange, 200, payload);
    }

    private void handleAiConfig(HttpExchange exchange) throws IOException {
        switch (exchange.getRequestMethod()) {
            case "GET" -> sendJson(exchange, 200, aiConfigPayload());
            case "POST" -> handleAiConfigSave(exchange);
            default -> sendJsonError(exchange, 405, "method_not_allowed", "Metodo no permitido");
        }
    }

    private ObjectNode aiConfigPayload() {
        ObjectNode payload = mapper.createObjectNode();
        payload.put("ok", true);
        payload.put("configured", configured);
        payload.put("configPath", configStore.file().toString());
        payload.put("secretsStoredInHost", true);
        if (configError != null) {
            payload.put("configError", configError);
        }
        payload.set("selection", selectionJson(config.selection()));
        ArrayNode providers = payload.putArray("providers");
        for (AiProvider provider : config.providers()) {
            providers.add(providerJson(provider));
        }
        ArrayNode routinesJson = payload.putArray("routines");
        for (RoutineSummary summary : routines.list()) {
            ObjectNode node = routinesJson.addObject();
            node.put("id", summary.id());
            node.put("name", summary.name());
            node.put("updatedAt", summary.updatedAt());
        }
        return payload;
    }

    private ObjectNode providerJson(AiProvider provider) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", provider.id());
        node.put("name", provider.name());
        node.put("kind", provider.kind().wireValue());
        if (provider.apiBaseUrl() != null) {
            node.put("apiBaseUrl", provider.apiBaseUrl());
        }
        node.put("requiresSecret", provider.requiresSecret());
        // Solo se expone la presencia de la clave, nunca su valor.
        node.put("hasSecret", secrets.has(provider.id()));
        ArrayNode models = node.putArray("models");
        for (AiModel model : provider.models()) {
            ObjectNode modelNode = models.addObject();
            modelNode.put("id", model.id());
            modelNode.put("name", model.name());
            modelNode.put("vision", model.vision());
            modelNode.put("streaming", model.streaming());
            modelNode.put("structuredOutputs", model.structuredOutputs());
            modelNode.put("toolCalling", model.toolCalling());
            if (model.notes() != null) {
                modelNode.put("notes", model.notes());
            }
        }
        return node;
    }

    private ObjectNode selectionJson(AiSelection selection) {
        ObjectNode node = mapper.createObjectNode();
        node.set("main", refJson(selection.main()));
        node.set("fallback1", refJson(selection.fallback1()));
        node.set("fallback2", refJson(selection.fallback2()));
        return node;
    }

    private JsonNode refJson(AiSelectionRef ref) {
        if (ref == null) {
            return mapper.nullNode();
        }
        ObjectNode node = mapper.createObjectNode();
        node.put("provider", ref.provider());
        node.put("model", ref.model());
        return node;
    }

    private void handleAiConfigSave(HttpExchange exchange) throws IOException {
        JsonNode body = readBody(exchange);
        if (body == null || !body.isObject() || !body.has("selection")) {
            sendJsonError(exchange, 400, "invalid_request", "Falta el campo 'selection'");
            return;
        }
        AiSelectionRef main = parseRef(body.path("selection").path("main"));
        if (main == null) {
            sendJsonError(exchange, 400, "invalid_request", "La seleccion 'main' es obligatoria");
            return;
        }
        AiSelection selection = new AiSelection(
                main,
                parseRef(body.path("selection").path("fallback1")),
                parseRef(body.path("selection").path("fallback2")));
        // El catalogo de proveedores no se edita por el panel en este corte: se conserva el actual.
        AiConfig next = new AiConfig(config.schemaVersion(), config.providers(), selection);
        List<String> refErrors = next.referenceErrors();
        if (!refErrors.isEmpty()) {
            sendJsonError(exchange, 400, "invalid_selection", String.join("; ", refErrors));
            return;
        }
        try {
            configStore.save(next, secrets);
        } catch (AiConfigException exception) {
            sendJsonError(exchange, 400, "config_rejected", exception.getMessage());
            return;
        }
        loadConfig();
        sendJson(exchange, 200, aiConfigPayload());
    }

    private void handleAiSecret(HttpExchange exchange) throws IOException {
        if (!"POST".equals(exchange.getRequestMethod())) {
            sendJsonError(exchange, 405, "method_not_allowed", "Metodo no permitido");
            return;
        }
        JsonNode body = readBody(exchange);
        if (body == null || !body.isObject()) {
            sendJsonError(exchange, 400, "invalid_request", "Cuerpo JSON requerido");
            return;
        }
        String providerId = body.path("provider").asText("");
        if (config.provider(providerId).isEmpty()) {
            sendJsonError(exchange, 400, "unknown_provider", "Proveedor desconocido");
            return;
        }
        // apiKey ausente o vacia => limpiar la clave del proveedor.
        String apiKey = body.path("apiKey").asText("");
        AiConfigSecrets nextSecrets = secrets.with(providerId, apiKey);
        try {
            configStore.save(config, nextSecrets);
        } catch (AiConfigException exception) {
            sendJsonError(exchange, 400, "config_rejected", exception.getMessage());
            return;
        }
        loadConfig();
        ObjectNode payload = mapper.createObjectNode();
        payload.put("ok", true);
        payload.put("provider", providerId);
        // Confirmacion sin devolver nunca el valor de la clave.
        payload.put("hasSecret", secrets.has(providerId));
        sendJson(exchange, 200, payload);
    }

    private AiSelectionRef parseRef(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        String provider = node.path("provider").asText("");
        String model = node.path("model").asText("");
        if (provider.isBlank() || model.isBlank()) {
            return null;
        }
        return new AiSelectionRef(provider, model);
    }

    private void handleAiTest(HttpExchange exchange) throws IOException {
        if (!"POST".equals(exchange.getRequestMethod())) {
            sendJsonError(exchange, 405, "method_not_allowed", "Metodo no permitido");
            return;
        }
        JsonNode request = readBody(exchange);
        if (request == null) {
            sendJsonError(exchange, 400, "invalid_request", "Cuerpo JSON requerido");
            return;
        }
        String providerId = request.path("provider").asText("fake");
        String modelId = request.path("model").asText("");
        String prompt = request.path("prompt").asText("");
        if (prompt.isBlank()) {
            sendJsonError(exchange, 400, "empty_prompt", "El prompt de prueba no puede estar vacio");
            return;
        }
        AiProvider provider = config.provider(providerId).orElse(null);
        if (provider == null || provider.model(modelId).isEmpty()) {
            sendJsonError(exchange, 400, "unknown_model", "Proveedor o modelo desconocido");
            return;
        }
        if (provider.kind().requiresSecret() && !secrets.has(providerId)) {
            sendJsonError(
                    exchange,
                    400,
                    "missing_secret",
                    "El proveedor '" + providerId + "' no tiene clave configurada en el host");
            return;
        }
        if (provider.kind().requiresSecret()) {
            // Los backends de red reales llegan en el siguiente slice (020-D).
            sendJsonError(
                    exchange,
                    501,
                    "backend_not_implemented",
                    "El backend de red para proveedores reales aun no esta disponible");
            return;
        }

        long started = System.nanoTime();
        ObjectNode payload = mapper.createObjectNode();
        payload.put("ok", true);
        payload.put("provider", providerId);
        payload.put("model", modelId);
        payload.put("httpCode", 200);
        payload.put("durationMs", Math.max(1, (System.nanoTime() - started) / 1_000_000));
        payload.put("tokensPrompt", estimateTokens(prompt));
        payload.put("tokensCompletion", 18);
        payload.put("tokensTotal", estimateTokens(prompt) + 18);
        payload.put("response", "FAKE_OK: configuracion local disponible para pruebas sin secretos reales.");
        sendJson(exchange, 200, payload);
    }

    private JsonNode readBody(HttpExchange exchange) {
        try (InputStream stream = exchange.getRequestBody()) {
            byte[] raw = stream.readAllBytes();
            if (raw.length == 0) {
                return null;
            }
            return mapper.readTree(raw);
        } catch (IOException exception) {
            return null;
        }
    }

    private int estimateTokens(String text) {
        return Math.max(1, text.trim().split("\\s+").length);
    }

    private void sendResource(HttpExchange exchange, String resource, String contentType) throws IOException {
        try (InputStream stream = LocalControlPanelServer.class.getClassLoader().getResourceAsStream(resource)) {
            if (stream == null) {
                sendJsonError(exchange, 404, "not_found", "Recurso no encontrado");
                return;
            }
            byte[] body = stream.readAllBytes();
            Headers headers = exchange.getResponseHeaders();
            headers.set("Content-Type", contentType);
            headers.set("Cache-Control", "no-store");
            exchange.sendResponseHeaders(200, body.length);
            try (OutputStream output = exchange.getResponseBody()) {
                output.write(body);
            }
        }
    }

    private void sendJson(HttpExchange exchange, int status, JsonNode payload) throws IOException {
        byte[] body = mapper.writeValueAsBytes(payload);
        Headers headers = exchange.getResponseHeaders();
        headers.set("Content-Type", "application/json; charset=utf-8");
        headers.set("Cache-Control", "no-store");
        exchange.sendResponseHeaders(status, body.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(body);
        }
    }

    private void sendJsonError(HttpExchange exchange, int status, String code, String message) throws IOException {
        ObjectNode payload = mapper.createObjectNode();
        payload.put("ok", false);
        ObjectNode error = payload.putObject("error");
        error.put("code", code.toLowerCase(Locale.ROOT));
        error.put("message", message);
        sendJson(exchange, status, payload);
    }
}
