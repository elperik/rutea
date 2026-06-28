package es.etic.rutea.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

/**
 * Backend offline para pruebas de contrato. No llama a IA ni ejecuta acciones:
 * transforma señales obvias de ScreenContext en una propuesta validable.
 */
public final class FakeNavigationBackend implements AiNavigationBackend {

    private final ObjectMapper mapper;

    public FakeNavigationBackend(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public JsonNode propose(JsonNode request) {
        String requestId = request.path("requestId").asText();
        String instruction = normalize(request.path("instruction").asText());
        Set<String> allowedActions = values(request.path("allowedActions"));
        int maxActions = request.path("limits").path("maxActions").asInt(1);
        JsonNode screenContext = request.path("screenContext");

        ObjectNode proposal = mapper.createObjectNode();
        proposal.put("schemaVersion", 1);
        proposal.put("proposalId", stableUuid(requestId, "proposal"));
        proposal.put("requestId", requestId);
        proposal.put("strategyUsed", "structured");
        ArrayNode actions = proposal.putArray("actions");

        addSelectIfRequested(actions, requestId, instruction, allowedActions, screenContext, "mes", "junio", maxActions);
        addSelectIfRequested(
                actions, requestId, instruction, allowedActions, screenContext, "firmad", "no firm", maxActions);
        addClickIfRequested(actions, requestId, instruction, allowedActions, screenContext, "buscar", maxActions);

        if (actions.isEmpty()) {
            proposal.put("status", "cannot_proceed");
            proposal.put("explanation", "Backend fake sin coincidencias semánticas suficientes");
            proposal.put("stopReason", "no_matching_controls");
        } else {
            proposal.put("status", "actions_proposed");
            proposal.put("explanation", "Backend fake propuso acciones semánticas existentes en ScreenContext");
        }
        return proposal;
    }

    private void addSelectIfRequested(
            ArrayNode output,
            String requestId,
            String instruction,
            Set<String> allowedActions,
            JsonNode screenContext,
            String labelHint,
            String valueHint,
            int maxActions) {
        if (output.size() >= maxActions || !allowedActions.contains("select")) {
            return;
        }
        if (!instruction.contains(labelHint) && !instruction.contains(valueHint)) {
            return;
        }
        for (JsonNode control : screenContext.path("controls")) {
            if (!"select".equals(control.path("kind").asText())) {
                continue;
            }
            String haystack = normalize(control.path("accessibleName").asText() + " "
                    + control.path("label").asText() + " " + control.path("name").asText());
            if (!haystack.contains(labelHint)) {
                continue;
            }
            String value = optionContaining(control.path("options"), valueHint);
            if (value == null) {
                continue;
            }
            ObjectNode action = baseAction(requestId, output.size(), "select", "semantic");
            action.put("controlId", control.path("id").asText());
            action.put("value", value);
            action.put("risk", "low");
            action.put("requiresConfirmation", false);
            action.put("rationale", "Selección derivada de instrucción y opciones visibles");
            output.add(action);
            return;
        }
    }

    private void addClickIfRequested(
            ArrayNode output,
            String requestId,
            String instruction,
            Set<String> allowedActions,
            JsonNode screenContext,
            String hint,
            int maxActions) {
        if (output.size() >= maxActions || !allowedActions.contains("click") || !instruction.contains(hint)) {
            return;
        }
        for (JsonNode actionCandidate : screenContext.path("actions")) {
            if (!"click".equals(actionCandidate.path("kind").asText())) {
                continue;
            }
            String description = normalize(actionCandidate.path("description").asText());
            if (!description.contains(hint)) {
                continue;
            }
            ObjectNode action = baseAction(requestId, output.size(), "click", "semantic");
            action.put("actionId", actionCandidate.path("actionId").asText());
            if (actionCandidate.hasNonNull("controlId")) {
                action.put("controlId", actionCandidate.path("controlId").asText());
            }
            action.put("risk", actionCandidate.path("risk").asText("low"));
            action.put("requiresConfirmation", false);
            action.put("rationale", "Click derivado de acción candidata visible");
            output.add(action);
            return;
        }
    }

    private ObjectNode baseAction(String requestId, int index, String action, String grounding) {
        ObjectNode node = mapper.createObjectNode();
        node.put("id", stableUuid(requestId, "action-" + index));
        node.put("grounding", grounding);
        node.put("action", action);
        return node;
    }

    private static Set<String> values(JsonNode array) {
        java.util.LinkedHashSet<String> values = new java.util.LinkedHashSet<>();
        for (JsonNode item : array) {
            values.add(item.asText());
        }
        return values;
    }

    private static String optionContaining(JsonNode options, String hint) {
        String normalizedHint = normalize(hint);
        for (JsonNode option : options) {
            String value = option.asText();
            if (normalize(value).contains(normalizedHint)) {
                return value;
            }
        }
        return null;
    }

    private static String stableUuid(String requestId, String suffix) {
        byte[] bytes = (requestId + ":" + suffix).getBytes(StandardCharsets.UTF_8);
        return UUID.nameUUIDFromBytes(bytes).toString();
    }

    private static String normalize(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
