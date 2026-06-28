package es.etic.rutea.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import es.etic.rutea.persistence.RoutineRepository;
import es.etic.rutea.persistence.RoutineSummary;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MessageHandlerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String MESSAGE_ID = "11111111-1111-4111-8111-111111111111";
    private static final String ROUTINE_ID = "44444444-4444-4444-8444-444444444444";

    private MessageHandler handler;
    private SchemaValidator validator;
    private FakeRoutineRepository repository;

    @BeforeEach
    void setUp() {
        validator = new SchemaValidator();
        repository = new FakeRoutineRepository();
        Clock fixed = Clock.fixed(Instant.parse("2026-06-27T18:00:00Z"), ZoneOffset.UTC);
        handler = new MessageHandler(MAPPER, validator, fixed, repository);
    }

    private JsonNode parse(String json) throws JsonProcessingException {
        return MAPPER.readTree(json);
    }

    private JsonNode envelope(String type, String payload) throws JsonProcessingException {
        return parse(
                """
                {
                  "protocolVersion": 1,
                  "messageId": "%s",
                  "type": "%s",
                  "timestamp": "2026-06-27T18:00:00Z",
                  "payload": %s
                }
                """
                        .formatted(MESSAGE_ID, type, payload));
    }

    private String routineJson() {
        return """
                {
                  "schemaVersion": 1,
                  "id": "%s",
                  "name": "Consulta",
                  "allowedDomains": ["fixtures.local"],
                  "steps": [
                    { "id": "22222222-2222-4222-8222-222222222222", "action": "navigate", "risk": "low", "confirmationRequired": false }
                  ]
                }
                """
                .formatted(ROUTINE_ID);
    }

    @Test
    void negociaProtocoloConHelloValido() throws JsonProcessingException {
        JsonNode request = envelope("hello", "{ \"requestedProtocolVersions\": [1] }");
        JsonNode response = handler.handle(request);

        assertThat(response.path("ok").asBoolean()).isTrue();
        assertThat(response.path("correlationId").asText()).isEqualTo(MESSAGE_ID);
        assertThat(response.path("payload").path("service").asText()).isEqualTo("rutea-native-host");
        assertThat(validator.validateNativeResponse(response)).isEmpty();
    }

    @Test
    void rechazaProtocoloIncompatible() throws JsonProcessingException {
        JsonNode response = handler.handle(envelope("hello", "{ \"requestedProtocolVersions\": [99] }"));
        assertThat(response.path("ok").asBoolean()).isFalse();
        assertThat(response.path("error").path("code").asText()).isEqualTo("UNSUPPORTED_PROTOCOL");
    }

    @Test
    void rechazaSobreSinTipo() throws JsonProcessingException {
        JsonNode request = parse(
                """
                {
                  "protocolVersion": 1,
                  "messageId": "%s",
                  "timestamp": "2026-06-27T18:00:00Z"
                }
                """
                        .formatted(MESSAGE_ID));
        JsonNode response = handler.handle(request);
        assertThat(response.path("error").path("code").asText()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void guardaUnaRutinaValida() throws JsonProcessingException {
        JsonNode response = handler.handle(envelope("routine.save", "{ \"routine\": " + routineJson() + " }"));

        assertThat(response.path("ok").asBoolean()).isTrue();
        assertThat(response.path("payload").path("id").asText()).isEqualTo(ROUTINE_ID);
        assertThat(repository.findJson(ROUTINE_ID)).isPresent();
        assertThat(validator.validateNativeResponse(response)).isEmpty();
    }

    @Test
    void rechazaUnaRutinaInvalida() throws JsonProcessingException {
        String invalid = "{ \"schemaVersion\": 1, \"id\": \"" + ROUTINE_ID + "\", \"name\": \"x\", \"allowedDomains\": [], \"steps\": [] }";
        JsonNode response = handler.handle(envelope("routine.save", "{ \"routine\": " + invalid + " }"));

        assertThat(response.path("ok").asBoolean()).isFalse();
        assertThat(response.path("error").path("code").asText()).isEqualTo("VALIDATION_ERROR");
        assertThat(repository.findJson(ROUTINE_ID)).isEmpty();
    }

    @Test
    void listaGetYDelete() throws JsonProcessingException {
        handler.handle(envelope("routine.save", "{ \"routine\": " + routineJson() + " }"));

        JsonNode list = handler.handle(envelope("routine.list", "{}"));
        assertThat(list.path("payload").path("routines")).hasSize(1);

        JsonNode get = handler.handle(envelope("routine.get", "{ \"id\": \"" + ROUTINE_ID + "\" }"));
        assertThat(get.path("payload").path("found").asBoolean()).isTrue();
        assertThat(get.path("payload").path("routine").path("name").asText()).isEqualTo("Consulta");

        JsonNode deleted = handler.handle(envelope("routine.delete", "{ \"id\": \"" + ROUTINE_ID + "\" }"));
        assertThat(deleted.path("payload").path("deleted").asBoolean()).isTrue();

        JsonNode missing = handler.handle(envelope("routine.get", "{ \"id\": \"" + ROUTINE_ID + "\" }"));
        assertThat(missing.path("payload").path("found").asBoolean()).isFalse();
    }

    @Test
    void proponeNavegacionIaConBackendFake() throws JsonProcessingException {
        JsonNode response = handler.handle(envelope("ai.navigation.propose", SchemaValidatorTest.aiRequestJson()));

        assertThat(response.path("ok").asBoolean()).isTrue();
        JsonNode proposal = response.path("payload").path("proposal");
        assertThat(proposal.path("status").asText()).isEqualTo("actions_proposed");
        assertThat(proposal.path("strategyUsed").asText()).isEqualTo("structured");
        assertThat(proposal.path("actions")).hasSize(3);
        assertThat(proposal.path("actions").get(0).path("action").asText()).isEqualTo("select");
        assertThat(proposal.path("actions").get(0).path("controlId").asText()).isEqualTo("c1");
        assertThat(proposal.path("actions").get(0).path("value").asText()).isEqualTo("Junio");
        assertThat(proposal.path("actions").get(1).path("controlId").asText()).isEqualTo("c2");
        assertThat(proposal.path("actions").get(1).path("value").asText()).isEqualTo("Mes No Firmado");
        assertThat(proposal.path("actions").get(2).path("action").asText()).isEqualTo("click");
        assertThat(proposal.path("actions").get(2).path("actionId").asText()).isEqualTo("a3");
        assertThat(validator.validateNativeResponse(response)).isEmpty();
        assertThat(validator.validateAiNavigationProposal(proposal)).isEmpty();
    }

    @Test
    void rechazaPeticionIaInvalida() throws JsonProcessingException {
        JsonNode response = handler.handle(envelope("ai.navigation.propose", "{ \"schemaVersion\": 1 }"));

        assertThat(response.path("ok").asBoolean()).isFalse();
        assertThat(response.path("error").path("code").asText()).isEqualTo("VALIDATION_ERROR");
    }

    /** Repositorio en memoria para pruebas del handler. */
    private static final class FakeRoutineRepository implements RoutineRepository {
        private final Map<String, String[]> store = new LinkedHashMap<>();

        @Override
        public void save(String id, String name, String json, String updatedAt) {
            store.put(id, new String[] {name, json, updatedAt});
        }

        @Override
        public Optional<String> findJson(String id) {
            String[] row = store.get(id);
            return row == null ? Optional.empty() : Optional.of(row[1]);
        }

        @Override
        public List<RoutineSummary> list() {
            List<RoutineSummary> summaries = new ArrayList<>();
            for (Map.Entry<String, String[]> entry : store.entrySet()) {
                summaries.add(new RoutineSummary(entry.getKey(), entry.getValue()[0], entry.getValue()[2]));
            }
            return summaries;
        }

        @Override
        public boolean delete(String id) {
            return store.remove(id) != null;
        }
    }
}
