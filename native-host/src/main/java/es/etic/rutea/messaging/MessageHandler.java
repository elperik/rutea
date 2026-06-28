package es.etic.rutea.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import es.etic.rutea.ai.AiNavigationBackend;
import es.etic.rutea.ai.FakeNavigationBackend;
import es.etic.rutea.persistence.PersistenceException;
import es.etic.rutea.persistence.RoutineRepository;
import es.etic.rutea.persistence.RoutineSummary;

import java.time.Clock;
import java.util.List;
import java.util.Optional;
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
    private final RoutineRepository routines;
    private final AiNavigationBackend aiNavigationBackend;

    public MessageHandler(
            ObjectMapper mapper, SchemaValidator validator, Clock clock, RoutineRepository routines) {
        this(mapper, validator, clock, routines, new FakeNavigationBackend(mapper));
    }

    public MessageHandler(
            ObjectMapper mapper,
            SchemaValidator validator,
            Clock clock,
            RoutineRepository routines,
            AiNavigationBackend aiNavigationBackend) {
        this.mapper = mapper;
        this.validator = validator;
        this.clock = clock;
        this.routines = routines;
        this.aiNavigationBackend = aiNavigationBackend;
    }

    public JsonNode handle(JsonNode request) {
        String correlationId = extractCorrelationId(request);

        List<String> envelopeErrors = validator.validateNativeMessage(request);
        if (!envelopeErrors.isEmpty()) {
            return error(correlationId, "VALIDATION_ERROR", "Sobre inválido: " + join(envelopeErrors));
        }

        String type = request.path("type").asText();
        try {
            return switch (type) {
                case "hello" -> handleHello(request, correlationId);
                case "routine.save" -> handleRoutineSave(request, correlationId);
                case "routine.list" -> handleRoutineList(correlationId);
                case "routine.get" -> handleRoutineGet(request, correlationId);
                case "routine.delete" -> handleRoutineDelete(request, correlationId);
                case "ai.navigation.propose" -> handleAiNavigationPropose(request, correlationId);
                default ->
                        error(correlationId, "VALIDATION_ERROR", "Tipo de mensaje no soportado: " + type);
            };
        } catch (PersistenceException exception) {
            return error(correlationId, "PERSISTENCE_ERROR", "Error de persistencia");
        }
    }

    private JsonNode handleAiNavigationPropose(JsonNode request, String correlationId) {
        JsonNode payload = request.path("payload");
        List<String> requestErrors = validator.validateAiNavigationRequest(payload);
        if (!requestErrors.isEmpty()) {
            return error(correlationId, "VALIDATION_ERROR", "PeticiÃ³n IA invÃ¡lida: " + join(requestErrors));
        }

        JsonNode proposal = aiNavigationBackend.propose(payload);
        List<String> proposalErrors = validator.validateAiNavigationProposal(proposal);
        if (!proposalErrors.isEmpty()) {
            return error(correlationId, "INTERNAL_ERROR", "Propuesta IA invÃ¡lida: " + join(proposalErrors));
        }

        ObjectNode result = mapper.createObjectNode();
        result.set("proposal", proposal);
        return success(correlationId, result);
    }

    private JsonNode handleRoutineSave(JsonNode request, String correlationId) {
        JsonNode routine = request.path("payload").path("routine");
        List<String> routineErrors = validator.validateRoutine(routine);
        if (!routineErrors.isEmpty()) {
            return error(correlationId, "VALIDATION_ERROR", "Rutina inválida: " + join(routineErrors));
        }

        String id = routine.path("id").asText();
        String name = routine.path("name").asText();
        String updatedAt = clock.instant().toString();
        String json;
        try {
            json = mapper.writeValueAsString(routine);
        } catch (JsonProcessingException exception) {
            return error(correlationId, "INTERNAL_ERROR", "No se pudo serializar la rutina");
        }

        routines.save(id, name, json, updatedAt);

        ObjectNode payload = mapper.createObjectNode();
        payload.put("id", id);
        payload.put("updatedAt", updatedAt);
        return success(correlationId, payload);
    }

    private JsonNode handleRoutineList(String correlationId) {
        ObjectNode payload = mapper.createObjectNode();
        ArrayNode array = payload.putArray("routines");
        for (RoutineSummary summary : routines.list()) {
            ObjectNode node = array.addObject();
            node.put("id", summary.id());
            node.put("name", summary.name());
            node.put("updatedAt", summary.updatedAt());
        }
        return success(correlationId, payload);
    }

    private JsonNode handleRoutineGet(JsonNode request, String correlationId) {
        String id = request.path("payload").path("id").asText();
        Optional<String> json = routines.findJson(id);
        ObjectNode payload = mapper.createObjectNode();
        if (json.isEmpty()) {
            payload.put("found", false);
            return success(correlationId, payload);
        }
        try {
            payload.put("found", true);
            payload.set("routine", mapper.readTree(json.get()));
        } catch (JsonProcessingException exception) {
            return error(correlationId, "PERSISTENCE_ERROR", "Rutina almacenada corrupta");
        }
        return success(correlationId, payload);
    }

    private JsonNode handleRoutineDelete(JsonNode request, String correlationId) {
        String id = request.path("payload").path("id").asText();
        boolean deleted = routines.delete(id);
        ObjectNode payload = mapper.createObjectNode();
        payload.put("deleted", deleted);
        return success(correlationId, payload);
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
        ArrayNode capabilities = result.putArray("capabilities");
        capabilities.add("routine.save");
        capabilities.add("routine.list");
        capabilities.add("routine.get");
        capabilities.add("routine.delete");
        capabilities.add("ai.navigation.propose");
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
