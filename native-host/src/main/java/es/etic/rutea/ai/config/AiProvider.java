package es.etic.rutea.ai.config;

import java.util.List;
import java.util.Optional;

/**
 * Proveedor IA del catalogo local. No contiene la clave API: el secreto se separa
 * a {@link AiConfigSecrets} al cargar la configuracion y nunca viaja con este record.
 */
public record AiProvider(
        String id,
        String name,
        AiProviderKind kind,
        String apiBaseUrl,
        List<AiModel> models) {

    public AiProvider {
        models = models == null ? List.of() : List.copyOf(models);
    }

    public Optional<AiModel> model(String modelId) {
        return models.stream().filter(model -> model.id().equals(modelId)).findFirst();
    }

    public boolean requiresSecret() {
        return kind.requiresSecret();
    }
}
