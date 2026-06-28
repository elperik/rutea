package es.etic.rutea.controlpanel;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import es.etic.rutea.persistence.RoutineRepository;
import es.etic.rutea.persistence.RoutineSummary;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LocalControlPanelServerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private LocalControlPanelServer server;
    private URI baseUri;
    private HttpClient client;

    @BeforeEach
    void setUp() throws Exception {
        Clock fixed = Clock.fixed(Instant.parse("2026-06-28T18:00:00Z"), ZoneOffset.UTC);
        server = new LocalControlPanelServer(MAPPER, new FakeRoutineRepository(), fixed, 0);
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
    void exponeConfiguracionIaFakeYRutinas() throws Exception {
        JsonNode node = json(get("/api/ai-config"));

        assertThat(node.path("ok").asBoolean()).isTrue();
        assertThat(node.path("active").path("main").path("provider").asText()).isEqualTo("fake");
        assertThat(node.path("providers")).hasSize(3);
        assertThat(node.path("routines")).hasSize(1);
    }

    @Test
    void pruebaModeloFake() throws Exception {
        HttpRequest request = HttpRequest.newBuilder(baseUri.resolve("/api/ai-test"))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        "{\"provider\":\"fake\",\"model\":\"fake-structured\",\"prompt\":\"hola\"}"))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode node = MAPPER.readTree(response.body());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(node.path("ok").asBoolean()).isTrue();
        assertThat(node.path("response").asText()).contains("FAKE_OK");
        assertThat(node.path("tokensTotal").asInt()).isGreaterThan(0);
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
