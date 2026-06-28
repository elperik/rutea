package es.etic.rutea.ai.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Configuracion IA del host: catalogo de proveedores y seleccion activa.
 *
 * <p>No contiene secretos. La integridad referencial (que la seleccion apunte a
 * proveedores/modelos existentes) se comprueba con {@link #referenceErrors()},
 * porque JSON Schema no expresa referencias cruzadas dentro del documento.</p>
 */
public record AiConfig(int schemaVersion, List<AiProvider> providers, AiSelection selection) {

    public AiConfig {
        providers = providers == null ? List.of() : List.copyOf(providers);
    }

    public Optional<AiProvider> provider(String providerId) {
        return providers.stream().filter(provider -> provider.id().equals(providerId)).findFirst();
    }

    /**
     * Comprueba que cada referencia de la seleccion exista en el catalogo.
     *
     * @return lista de errores legibles; vacia si la configuracion es coherente.
     */
    public List<String> referenceErrors() {
        List<String> errors = new ArrayList<>();
        checkRef("main", selection.main(), errors);
        checkRef("fallback1", selection.fallback1(), errors);
        checkRef("fallback2", selection.fallback2(), errors);
        return errors;
    }

    private void checkRef(String label, AiSelectionRef ref, List<String> errors) {
        if (ref == null) {
            if ("main".equals(label)) {
                errors.add("La seleccion 'main' es obligatoria");
            }
            return;
        }
        Optional<AiProvider> provider = provider(ref.provider());
        if (provider.isEmpty()) {
            errors.add(label + ": proveedor desconocido '" + ref.provider() + "'");
            return;
        }
        if (provider.get().model(ref.model()).isEmpty()) {
            errors.add(label + ": el proveedor '" + ref.provider() + "' no tiene el modelo '" + ref.model() + "'");
        }
    }
}
