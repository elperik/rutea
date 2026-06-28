package es.etic.rutea.controlpanel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import es.etic.rutea.messaging.MessageHandler;
import es.etic.rutea.persistence.RoutineRepository;
import es.etic.rutea.persistence.RoutineSummary;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Executors;

public final class LocalControlPanelServer implements AutoCloseable {

    public static final int DEFAULT_PORT = 8765;

    private final ObjectMapper mapper;
    private final RoutineRepository routines;
    private final Clock clock;
    private final HttpServer server;

    public LocalControlPanelServer(
            ObjectMapper mapper, RoutineRepository routines, Clock clock, int port) throws IOException {
        this.mapper = mapper;
        this.routines = routines;
        this.clock = clock;
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

    private void registerRoutes() {
        server.createContext("/", this::handleIndex);
        server.createContext("/assets/panel.css", exchange -> handleResource(exchange, "panel/panel.css", "text/css"));
        server.createContext(
                "/assets/panel.js",
                exchange -> handleResource(exchange, "panel/panel.js", "application/javascript"));
        server.createContext("/api/health", this::handleHealth);
        server.createContext("/api/ai-config", this::handleAiConfig);
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
        if (!"GET".equals(exchange.getRequestMethod())) {
            sendJsonError(exchange, 405, "method_not_allowed", "Metodo no permitido");
            return;
        }

        ObjectNode payload = mapper.createObjectNode();
        payload.put("ok", true);
        payload.set("active", activeConfig());

        ArrayNode providers = payload.putArray("providers");
        providers.add(provider(
                "fake",
                "Fake local",
                "Backend offline para pruebas de contrato",
                false,
                Map.of("fake-structured", model("Fake Structured", false, false, true, false))));
        providers.add(provider(
                "openai-compatible",
                "OpenAI compatible",
                "GitHub Models, NVIDIA NIM, OpenRouter u otros endpoints compatibles",
                true,
                Map.of("config-required", model("Configurar modelo", true, false, true, true))));
        providers.add(provider(
                "gemini",
                "Google Gemini",
                "Backend Gemini con adaptador propio",
                true,
                Map.of("config-required", model("Configurar modelo", true, true, true, false))));

        ArrayNode routinesJson = payload.putArray("routines");
        for (RoutineSummary summary : routines.list()) {
            ObjectNode node = routinesJson.addObject();
            node.put("id", summary.id());
            node.put("name", summary.name());
            node.put("updatedAt", summary.updatedAt());
        }

        sendJson(exchange, 200, payload);
    }

    private void handleAiTest(HttpExchange exchange) throws IOException {
        if (!"POST".equals(exchange.getRequestMethod())) {
            sendJsonError(exchange, 405, "method_not_allowed", "Metodo no permitido");
            return;
        }
        JsonNode request = mapper.readTree(exchange.getRequestBody());
        String provider = request.path("provider").asText("fake");
        String model = request.path("model").asText("fake-structured");
        String prompt = request.path("prompt").asText("");
        if (!"fake".equals(provider) || !"fake-structured".equals(model)) {
            sendJsonError(exchange, 400, "provider_not_configured", "Solo el proveedor fake esta disponible en este corte");
            return;
        }
        if (prompt.isBlank()) {
            sendJsonError(exchange, 400, "empty_prompt", "El prompt de prueba no puede estar vacio");
            return;
        }

        long started = System.nanoTime();
        ObjectNode payload = mapper.createObjectNode();
        payload.put("ok", true);
        payload.put("provider", provider);
        payload.put("model", model);
        payload.put("httpCode", 200);
        payload.put("durationMs", Math.max(1, (System.nanoTime() - started) / 1_000_000));
        payload.put("tokensPrompt", estimateTokens(prompt));
        payload.put("tokensCompletion", 18);
        payload.put("tokensTotal", estimateTokens(prompt) + 18);
        payload.put("response", "FAKE_OK: configuracion local disponible para pruebas sin secretos reales.");
        sendJson(exchange, 200, payload);
    }

    private ObjectNode activeConfig() {
        ObjectNode active = mapper.createObjectNode();
        active.set("main", slot("fake", "fake-structured"));
        active.set("fallback1", slot("openai-compatible", "config-required"));
        active.set("fallback2", slot("gemini", "config-required"));
        active.put("secretsStoredInHost", true);
        active.put("secretsConfigured", false);
        return active;
    }

    private ObjectNode slot(String provider, String model) {
        ObjectNode node = mapper.createObjectNode();
        node.put("provider", provider);
        node.put("model", model);
        return node;
    }

    private ObjectNode provider(
            String id, String name, String description, boolean requiresSecret, Map<String, ObjectNode> models) {
        ObjectNode provider = mapper.createObjectNode();
        provider.put("id", id);
        provider.put("name", name);
        provider.put("description", description);
        provider.put("requiresSecret", requiresSecret);
        ArrayNode modelArray = provider.putArray("models");
        for (Map.Entry<String, ObjectNode> entry : models.entrySet()) {
            ObjectNode model = entry.getValue().deepCopy();
            model.put("id", entry.getKey());
            modelArray.add(model);
        }
        return provider;
    }

    private ObjectNode model(
            String name, boolean vision, boolean streaming, boolean structuredOutputs, boolean toolCalling) {
        ObjectNode model = mapper.createObjectNode();
        model.put("name", name);
        model.put("vision", vision);
        model.put("streaming", streaming);
        model.put("structuredOutputs", structuredOutputs);
        model.put("toolCalling", toolCalling);
        return model;
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
