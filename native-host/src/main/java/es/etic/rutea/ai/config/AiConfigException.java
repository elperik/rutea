package es.etic.rutea.ai.config;

import java.util.List;

/**
 * Error de carga, validacion o guardado de la configuracion IA local.
 * Los mensajes referencian rutas de esquema, nunca valores de secretos.
 */
public final class AiConfigException extends RuntimeException {

    private final List<String> details;

    public AiConfigException(String message, List<String> details) {
        super(message);
        this.details = details == null ? List.of() : List.copyOf(details);
    }

    public AiConfigException(String message, Throwable cause) {
        super(message, cause);
        this.details = List.of();
    }

    public List<String> details() {
        return details;
    }
}
