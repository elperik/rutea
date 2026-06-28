package es.etic.rutea.ai.config;

import java.util.Locale;

/**
 * Tipo de proveedor IA. Determina el adaptador de red que el host usara para
 * dialogar con el proveedor. {@code FAKE} es un backend offline sin secretos.
 */
public enum AiProviderKind {
    FAKE("fake"),
    OPENAI_COMPATIBLE("openai-compatible"),
    GEMINI("gemini");

    private final String wireValue;

    AiProviderKind(String wireValue) {
        this.wireValue = wireValue;
    }

    /** Valor textual usado en el JSON de configuracion. */
    public String wireValue() {
        return wireValue;
    }

    /** Indica si el proveedor necesita una clave API en el host para operar. */
    public boolean requiresSecret() {
        return this != FAKE;
    }

    public static AiProviderKind fromWire(String value) {
        String normalized = value == null ? "" : value.toLowerCase(Locale.ROOT);
        for (AiProviderKind kind : values()) {
            if (kind.wireValue.equals(normalized)) {
                return kind;
            }
        }
        throw new IllegalArgumentException("Tipo de proveedor IA desconocido: " + value);
    }
}
