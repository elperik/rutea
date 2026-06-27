package es.etic.rutea.messaging;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class SchemaValidatorTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static SchemaValidator validator;

    @BeforeAll
    static void setUp() {
        validator = new SchemaValidator();
    }

    private static JsonNode parse(String json) throws JsonProcessingException {
        return MAPPER.readTree(json);
    }

    @Test
    void aceptaUnSobreValido() throws JsonProcessingException {
        JsonNode node = parse(
                """
                {
                  "protocolVersion": 1,
                  "messageId": "11111111-1111-4111-8111-111111111111",
                  "type": "hello",
                  "timestamp": "2026-06-27T18:00:00Z"
                }
                """);
        assertThat(validator.validateNativeMessage(node)).isEmpty();
    }

    @Test
    void rechazaUnSobreSinTipo() throws JsonProcessingException {
        JsonNode node = parse(
                """
                {
                  "protocolVersion": 1,
                  "messageId": "11111111-1111-4111-8111-111111111111",
                  "timestamp": "2026-06-27T18:00:00Z"
                }
                """);
        assertThat(validator.validateNativeMessage(node)).isNotEmpty();
    }

    @Test
    void rechazaCamposDesconocidos() throws JsonProcessingException {
        JsonNode node = parse(
                """
                {
                  "protocolVersion": 1,
                  "messageId": "11111111-1111-4111-8111-111111111111",
                  "type": "hello",
                  "timestamp": "2026-06-27T18:00:00Z",
                  "inesperado": true
                }
                """);
        assertThat(validator.validateNativeMessage(node)).isNotEmpty();
    }

    @Test
    void aceptaUnaRutinaMinima() throws JsonProcessingException {
        JsonNode node = parse(
                """
                {
                  "schemaVersion": 1,
                  "id": "11111111-1111-4111-8111-111111111111",
                  "name": "Consulta de prueba",
                  "allowedDomains": ["fixtures.local"],
                  "steps": [
                    {
                      "id": "22222222-2222-4222-8222-222222222222",
                      "action": "navigate",
                      "risk": "low",
                      "confirmationRequired": false
                    }
                  ]
                }
                """);
        assertThat(validator.validateRoutine(node)).isEmpty();
    }
}
