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

    @Test
    void aceptaRequestYProposalDeNavegacionIa() throws JsonProcessingException {
        JsonNode request = parse(aiRequestJson());
        assertThat(validator.validateScreenContext(request.path("screenContext"))).isEmpty();
        assertThat(validator.validateAiNavigationRequest(request)).isEmpty();

        JsonNode proposal = parse(
                """
                {
                  "schemaVersion": 1,
                  "proposalId": "33333333-3333-4333-8333-333333333333",
                  "requestId": "11111111-1111-4111-8111-111111111111",
                  "status": "actions_proposed",
                  "strategyUsed": "structured",
                  "actions": [
                    {
                      "id": "44444444-4444-4444-8444-444444444444",
                      "grounding": "semantic",
                      "action": "click",
                      "actionId": "a1",
                      "risk": "low",
                      "requiresConfirmation": false,
                      "rationale": "Buscar"
                    }
                  ],
                  "explanation": "ok"
                }
                """);
        assertThat(validator.validateAiNavigationProposal(proposal)).isEmpty();
    }

    @Test
    void rechazaProposalSemanticaSinGrounding() throws JsonProcessingException {
        JsonNode proposal = parse(
                """
                {
                  "schemaVersion": 1,
                  "proposalId": "33333333-3333-4333-8333-333333333333",
                  "requestId": "11111111-1111-4111-8111-111111111111",
                  "status": "actions_proposed",
                  "strategyUsed": "structured",
                  "actions": [
                    {
                      "id": "44444444-4444-4444-8444-444444444444",
                      "grounding": "semantic",
                      "action": "click",
                      "risk": "low",
                      "requiresConfirmation": false,
                      "rationale": "Buscar"
                    }
                  ],
                  "explanation": "sin referencia"
                }
                """);
        assertThat(validator.validateAiNavigationProposal(proposal)).isNotEmpty();
    }

    static String aiRequestJson() {
        return """
                {
                  "schemaVersion": 1,
                  "requestId": "11111111-1111-4111-8111-111111111111",
                  "strategy": "auto",
                  "instruction": "Elegir junio y no firmados y pulsar Buscar",
                  "url": "https://soi.gpex.es/inicio.php",
                  "allowedDomains": ["soi.gpex.es"],
                  "allowedActions": ["select", "click", "assert"],
                  "limits": {
                    "maxModelTurns": 5,
                    "maxActions": 20,
                    "maxIterations": 1,
                    "maxInputBytes": 65536,
                    "maxScreenshotCount": 0,
                    "maxDurationMs": 60000
                  },
                  "screenContext": {
                    "schemaVersion": 1,
                    "url": "https://soi.gpex.es/inicio.php",
                    "title": "Datos gestión / revisión / mensual",
                    "capturedAt": "2026-06-28T12:00:00Z",
                    "viewport": { "width": 1725, "height": 1247 },
                    "controls": [
                      {
                        "id": "c1",
                        "kind": "select",
                        "role": "combobox",
                        "accessibleName": "Mes",
                        "label": "Mes",
                        "value": "Mayo",
                        "options": ["Mayo", "Junio"],
                        "visible": true,
                        "enabled": true,
                        "locatorCandidates": [{ "kind": "label", "value": "Mes" }]
                      },
                      {
                        "id": "c2",
                        "kind": "select",
                        "role": "combobox",
                        "accessibleName": "Firmadas",
                        "label": "Firmadas",
                        "value": "Mes Enviado",
                        "options": ["Mes Enviado", "Mes No Firmado"],
                        "visible": true,
                        "enabled": true,
                        "locatorCandidates": [{ "kind": "label", "value": "Firmadas" }]
                      },
                      {
                        "id": "c3",
                        "kind": "button",
                        "role": "button",
                        "accessibleName": "Buscar",
                        "text": "Buscar",
                        "visible": true,
                        "enabled": true,
                        "locatorCandidates": [{ "kind": "role", "value": "button", "name": "Buscar" }]
                      }
                    ],
                    "tables": [],
                    "actions": [
                      { "actionId": "a1", "kind": "select", "controlId": "c1", "description": "Seleccionar Mes", "risk": "low" },
                      { "actionId": "a2", "kind": "select", "controlId": "c2", "description": "Seleccionar Firmadas", "risk": "low" },
                      { "actionId": "a3", "kind": "click", "controlId": "c3", "description": "Click Buscar", "risk": "low" }
                    ],
                    "redactions": [],
                    "truncated": false,
                    "contextHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
                  }
                }
                """;
    }
}
