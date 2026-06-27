package es.etic.rutea.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

/**
 * Lógica de protocolo del host: valida el sobre entrante, atiende la negociación
 * {@code hello} y produce respuestas estructuradas conformes a
 * {@code native-response.schema.json}. No ejecuta lógica de negocio en Fase 0.
 */
public final class MessageHandler {

    public static final int PROTOCOL_VERSION = 1;
    public static final String SERVICE = "rutea-native-host";

    private final ObjectMapper mapper;
    private final SchemaValidator validator;
    private final Clock clock;

    public MessageHandler(ObjectMapper mapper, SchemaValidator validator, Clock clock) {
        this.mapper = mapper;
        this.validator = validator;
        this.clock = clock;
    }

    public JsonNode handle(JsonNode request) {
        String correlationId = extractCorrelationId(request);

        List<String> envelopeErrors = validator.validateNativeMessage(request);
        if (!envelopeErrors.isEmpty()) {
            return error(correlationId, "VALIDATION_ERROR", "Sobre inválido: " + join(envelopeErrors));
        }

        String type = request.path("type").asText();
        if ("hello".equals(type)) {
            return handleHello(request, correlationId);
        }
        return error(correlationId, "VALIDATION_ERROR", "Tipo de mensaje no soportado: " + type);
    }

    private JsonNode handleHello(JsonNode request, String correlationId) {
        JsonNode payload = request.path("payload");
        List<String> payloadErrors = validator.validateHelloRequest(payload);
        if (!payloadErrors.isEmpty()) {
            return error(correlationId, "VALIDATION_ERROR", "Negociación inválida: " + join(payloadErrors));
        }

        boolean supported = false;
        for (JsonNode version : payload.path("requestedProtocolVersions")) {
            if (version.asInt() == PROTOCOL_VERSION) {
                supported = true;
                break;
            }
        }
        if (!supported) {
            return error(
                    correlationId,
                    "UNSUPPORTED_PROTOCOL",
                    "El host solo soporta la versión de protocolo " + PROTOCOL_VERSION);
        }

        ObjectNode result = mapper.createObjectNode();
        result.put("protocolVersion", PROTOCOL_VERSION);
        ArrayNode supportedVersions = result.putArray("supportedProtocolVersions");
        supportedVersions.add(PROTOCOL_VERSION);
        result.putArray("capabilities");
        result.put("service", SERVICE);

        return success(correlationId, result);
    }

    private String extractCorrelationId(JsonNode request) {
        JsonNode messageId = request.path("messageId");
        if (messageId.isTextual() && isUuid(messageId.asText())) {
            return messageId.asText();
        }
        return UUID.randomUUID().toString();
    }

    private ObjectNode baseResponse(String correlationId, boolean ok) {
        ObjectNode response = mapper.createObjectNode();
        response.put("protocolVersion", PROTOCOL_VERSION);
        response.put("correlationId", correlationId);
        response.put("timestamp", clock.instant().toString());
        response.put("ok", ok);
        return response;
    }

    private ObjectNode success(String correlationId, JsonNode payload) {
        ObjectNode response = baseResponse(correlationId, true);
        response.set("payload", payload);
        return response;
    }

    private ObjectNode error(String correlationId, String code, String message) {
        ObjectNode response = baseResponse(correlationId, false);
        ObjectNode error = response.putObject("error");
        error.put("code", code);
        error.put("message", truncate(message, 500));
        return response;
    }

    private static String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }

    private static String join(List<String> messages) {
        return String.join("; ", messages);
    }

    private static boolean isUuid(String value) {
        try {
            UUID.fromString(value);
            return true;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }
}
