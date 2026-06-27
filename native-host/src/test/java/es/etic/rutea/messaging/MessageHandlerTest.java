package es.etic.rutea.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MessageHandlerTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String MESSAGE_ID = "11111111-1111-4111-8111-111111111111";

    private MessageHandler handler;
    private SchemaValidator validator;

    @BeforeEach
    void setUp() {
        validator = new SchemaValidator();
        Clock fixed = Clock.fixed(Instant.parse("2026-06-27T18:00:00Z"), ZoneOffset.UTC);
        handler = new MessageHandler(MAPPER, validator, fixed);
    }

    private JsonNode parse(String json) throws JsonProcessingException {
        return MAPPER.readTree(json);
    }

    @Test
    void negociaProtocoloConHelloValido() throws JsonProcessingException {
        JsonNode request = parse(
                """
                {
                  "protocolVersion": 1,
                  "messageId": "%s",
                  "type": "hello",
                  "timestamp": "2026-06-27T18:00:00Z",
                  "payload": { "requestedProtocolVersions": [1] }
                }
                """.formatted(MESSAGE_ID));

        JsonNode response = handler.handle(request);

        assertThat(response.path("ok").asBoolean()).isTrue();
        assertThat(response.path("correlationId").asText()).isEqualTo(MESSAGE_ID);
        assertThat(response.path("payload").path("service").asText()).isEqualTo("rutea-native-host");
        assertThat(response.path("payload").path("protocolVersion").asInt()).isEqualTo(1);
        // La respuesta debe cumplir su propio contrato.
        assertThat(validator.validateNativeResponse(response)).isEmpty();
    }

    @Test
    void rechazaProtocoloIncompatible() throws JsonProcessingException {
        JsonNode request = parse(
                """
                {
                  "protocolVersion": 1,
                  "messageId": "%s",
                  "type": "hello",
                  "timestamp": "2026-06-27T18:00:00Z",
                  "payload": { "requestedProtocolVersions": [99] }
                }
                """.formatted(MESSAGE_ID));

        JsonNode response = handler.handle(request);

        assertThat(response.path("ok").asBoolean()).isFalse();
        assertThat(response.path("error").path("code").asText()).isEqualTo("UNSUPPORTED_PROTOCOL");
        assertThat(validator.validateNativeResponse(response)).isEmpty();
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
                """.formatted(MESSAGE_ID));

        JsonNode response = handler.handle(request);

        assertThat(response.path("ok").asBoolean()).isFalse();
        assertThat(response.path("error").path("code").asText()).isEqualTo("VALIDATION_ERROR");
        assertThat(validator.validateNativeResponse(response)).isEmpty();
    }

    @Test
    void rechazaTipoNoSoportado() throws JsonProcessingException {
        JsonNode request = parse(
                """
                {
                  "protocolVersion": 1,
                  "messageId": "%s",
                  "type": "routine.execute",
                  "timestamp": "2026-06-27T18:00:00Z"
                }
                """.formatted(MESSAGE_ID));

        JsonNode response = handler.handle(request);

        assertThat(response.path("ok").asBoolean()).isFalse();
        assertThat(response.path("error").path("code").asText()).isEqualTo("VALIDATION_ERROR");
    }
}
