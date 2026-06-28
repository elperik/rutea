package es.etic.rutea.ai.config;

import com.fasterxml.jackson.databind.JsonNode;

/**
 * Modelo concreto de un proveedor IA con sus capacidades declaradas y parametros.
 *
 * <p>Las capacidades ({@code vision}, {@code streaming}, {@code structuredOutputs},
 * {@code toolCalling}) son metadatos de catalogo, no claves ni secretos. {@code params}
 * es un nodo libre (temperature, top_p/topP, max_tokens/maxOutputTokens, extra_body...)
 * para acomodar proveedores OpenAI-compatible y Gemini.</p>
 */
public record AiModel(
        String id,
        String name,
        boolean vision,
        boolean streaming,
        boolean structuredOutputs,
        boolean toolCalling,
        String notes,
        JsonNode params) {
}
