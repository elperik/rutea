package es.etic.rutea.controlpanel;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import es.etic.rutea.ai.config.AiConfigStore;
import es.etic.rutea.messaging.SchemaValidator;
import es.etic.rutea.persistence.RoutineRepository;
import es.etic.rutea.persistence.RoutineSummary;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalControlPanelServerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private LocalControlPanelServer server;
    private URI baseUri;
    private HttpClient client;

    @TempDir
    Path tempDir;

    @BeforeEach
    void setUp() throws Exception {
        Clock fixed = Clock.fixed(Instant.parse("2026-06-28T18:00:00Z"), ZoneOffset.UTC);
        // Fichero inexistente: el store sirve el catalogo por defecto (sin secretos).
        AiConfigStore configStore =
                new AiConfigStore(MAPPER, new SchemaValidator(), tempDir.resolve("ai-config.json"));
        server = new LocalControlPanelServer(MAPPER, new FakeRoutineRepository(), configStore, fixed, 0);
        server.start();
        baseUri = server.uri();
        client = HttpClient.newHttpClient();
    }

    @AfterEach
    void tearDown() {
        server.close();
    }

    @Test
    void sirvePanelEnLoopback() throws Exception {
        HttpResponse<String> response = get("/");

        assertThat(baseUri.getHost()).isEqualTo("127.0.0.1");
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("Rutea", "Panel local");
        assertThat(response.headers().firstValue("Content-Type")).hasValueSatisfying(
                contentType -> assertThat(contentType).contains("text/html"));
    }

    @Test
    void exponeSaludSinSecretos() throws Exception {
        JsonNode node = json(get("/api/health"));

        assertThat(node.path("ok").asBoolean()).isTrue();
        assertThat(node.path("bind").asText()).isEqualTo("127.0.0.1");
        assertThat(node.path("routineCount").asInt()).isEqualTo(1);
        assertThat(node.path("secretsInExtension").asBoolean()).isFalse();
    }

    @Test
    void exponeCatalogoPorDefectoSinSecretos() throws Exception {
        JsonNode node = json(get("/api/ai-config"));

        assertThat(node.path("ok").asBoolean()).isTrue();
        assertThat(node.path("configured").asBoolean()).isFalse();
        assertThat(node.path("selection").path("main").path("provider").asText()).isEqualTo("fake");
        assertThat(node.path("providers").size()).isGreaterThanOrEqualTo(2);
        assertThat(node.path("routines")).hasSize(1);
        // Ningun proveedor debe exponer una clave; solo la presencia.
        for (JsonNode provider : node.path("providers")) {
            assertThat(provider.has("apiKey")).isFalse();
            assertThat(provider.has("hasSecret")).isTrue();
        }
    }

    @Test
    void pruebaModeloFake() throws Exception {
        JsonNode node = MAPPER.readTree(post("/api/ai-test",
                "{\"provider\":\"fake\",\"model\":\"fake-structured\",\"prompt\":\"hola\"}").body());

        assertThat(node.path("ok").asBoolean()).isTrue();
        assertThat(node.path("response").asText()).contains("FAKE_OK");
        assertThat(node.path("tokensTotal").asInt()).isGreaterThan(0);
    }

    @Test
    void pruebaProveedorRealSinClaveRechazada() throws Exception {
        HttpResponse<String> response = post("/api/ai-test",
                "{\"provider\":\"github\",\"model\":\"gpt-4o-mini\",\"prompt\":\"hola\"}");
        JsonNode node = MAPPER.readTree(response.body());

        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(node.path("error").path("code").asText()).isEqualTo("missing_secret");
    }

    @Test
    void guardaSeleccionValidaYPersisteConfig() throws Exception {
        HttpResponse<String> response = post("/api/ai-config",
                "{\"selection\":{\"main\":{\"provider\":\"github\",\"model\":\"gpt-4o-mini\"}}}");
        JsonNode node = MAPPER.readTree(response.body());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(node.path("configured").asBoolean()).isTrue();
        assertThat(node.path("selection").path("main").path("provider").asText()).isEqualTo("github");
        assertThat(node.path("selection").path("main").path("model").asText()).isEqualTo("gpt-4o-mini");
    }

    @Test
    void rechazaSeleccionConModeloInexistente() throws Exception {
        HttpResponse<String> response = post("/api/ai-config",
                "{\"selection\":{\"main\":{\"provider\":\"github\",\"model\":\"no-existe\"}}}");
        JsonNode node = MAPPER.readTree(response.body());

        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(node.path("error").path("code").asText()).isEqualTo("invalid_selection");
    }

    @Test
    void guardaClaveSinDevolverSuValor() throws Exception {
        HttpResponse<String> response = post("/api/ai-secret",
                "{\"provider\":\"github\",\"apiKey\":\"clave-secreta-de-prueba\"}");
        JsonNode node = MAPPER.readTree(response.body());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(node.path("hasSecret").asBoolean()).isTrue();
        assertThat(response.body()).doesNotContain("clave-secreta-de-prueba");

        JsonNode config = json(get("/api/ai-config"));
        JsonNode github = providerById(config, "github");
        assertThat(github.path("hasSecret").asBoolean()).isTrue();
        assertThat(config.toString()).doesNotContain("clave-secreta-de-prueba");
    }

    private JsonNode providerById(JsonNode config, String id) {
        for (JsonNode provider : config.path("providers")) {
            if (provider.path("id").asText().equals(id)) {
                return provider;
            }
        }
        throw new AssertionError("Proveedor no encontrado: " + id);
    }

    private HttpResponse<String> post(String path, String body) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(baseUri.resolve(path))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private HttpResponse<String> get(String path) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(baseUri.resolve(path)).GET().build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private JsonNode json(HttpResponse<String> response) throws Exception {
        assertThat(response.statusCode()).isEqualTo(200);
        return MAPPER.readTree(response.body());
    }

    private static final class FakeRoutineRepository implements RoutineRepository {
        @Override
        public void save(String id, String name, String json, String updatedAt) {
        }

        @Override
        public Optional<String> findJson(String id) {
            return Optional.empty();
        }

        @Override
        public List<RoutineSummary> list() {
            return List.of(new RoutineSummary(
                    "11111111-1111-4111-8111-111111111111",
                    "Rutina de prueba",
                    "2026-06-28T18:00:00Z"));
        }

        @Override
        public boolean delete(String id) {
            return false;
        }
    }
}
