package es.etic.rutea.ai.config;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Seleccion activa de proveedor/modelo: principal y dos fallbacks opcionales,
 * siguiendo el patron principal/fallback1/fallback2 de 'track'.
 */
public record AiSelection(AiSelectionRef main, AiSelectionRef fallback1, AiSelectionRef fallback2) {

    /** Cadena ordenada principal -> fallback1 -> fallback2 (omitiendo los ausentes). */
    public List<AiSelectionRef> chain() {
        List<AiSelectionRef> chain = new ArrayList<>(3);
        chain.add(main);
        Optional.ofNullable(fallback1).ifPresent(chain::add);
        Optional.ofNullable(fallback2).ifPresent(chain::add);
        return List.copyOf(chain);
    }
}
