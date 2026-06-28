package es.etic.rutea.ai;

import com.fasterxml.jackson.databind.JsonNode;

public interface AiNavigationBackend {
    JsonNode propose(JsonNode request);
}
