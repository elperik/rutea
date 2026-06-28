package es.etic.rutea.ai.config;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

/**
 * Claves API por proveedor, separadas del catalogo no secreto.
 *
 * <p>Estas claves viven solo en el host: se cargan desde el fichero local, nunca se
 * serializan hacia el panel ni la extension y no deben escribirse en logs. El panel
 * solo conoce {@link #has(String)}.</p>
 */
public final class AiConfigSecrets {

    private final Map<String, String> keys;

    public AiConfigSecrets(Map<String, String> keys) {
        Map<String, String> copy = new LinkedHashMap<>();
        if (keys != null) {
            for (Map.Entry<String, String> entry : keys.entrySet()) {
                if (entry.getValue() != null && !entry.getValue().isBlank()) {
                    copy.put(entry.getKey(), entry.getValue());
                }
            }
        }
        this.keys = copy;
    }

    public static AiConfigSecrets empty() {
        return new AiConfigSecrets(Map.of());
    }

    public boolean has(String providerId) {
        return keys.containsKey(providerId);
    }

    public Optional<String> get(String providerId) {
        return Optional.ofNullable(keys.get(providerId));
    }

    public Set<String> providerIds() {
        return Set.copyOf(keys.keySet());
    }

    /** Devuelve una copia con la clave del proveedor fijada (o eliminada si es vacia/nula). */
    public AiConfigSecrets with(String providerId, String key) {
        Map<String, String> next = new LinkedHashMap<>(keys);
        if (key == null || key.isBlank()) {
            next.remove(providerId);
        } else {
            next.put(providerId, key);
        }
        return new AiConfigSecrets(next);
    }

    /** Vista interna inmutable; uso exclusivo del host para persistir o invocar proveedores. */
    Map<String, String> asMap() {
        return Map.copyOf(keys);
    }

    @Override
    public String toString() {
        // Nunca exponer las claves; solo cuantas hay para diagnostico.
        return "AiConfigSecrets{providers=" + keys.size() + "}";
    }
}
