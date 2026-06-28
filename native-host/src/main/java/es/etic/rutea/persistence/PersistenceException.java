package es.etic.rutea.persistence;

/** Error de acceso a datos. Encapsula las excepciones SQL del repositorio. */
public class PersistenceException extends RuntimeException {

    public PersistenceException(String message, Throwable cause) {
        super(message, cause);
    }
}
