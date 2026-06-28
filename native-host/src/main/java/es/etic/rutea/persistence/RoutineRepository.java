package es.etic.rutea.persistence;

import java.util.List;
import java.util.Optional;

/** Acceso a las rutinas persistidas. Interfaz para permitir sustituir el almacén. */
public interface RoutineRepository {

    /** Inserta o reemplaza una rutina por su id. */
    void save(String id, String name, String json, String updatedAt);

    /** Devuelve el JSON de la rutina por id, si existe. */
    Optional<String> findJson(String id);

    /** Lista los resúmenes de todas las rutinas. */
    List<RoutineSummary> list();

    /** Elimina una rutina por id; devuelve true si existía. */
    boolean delete(String id);
}
