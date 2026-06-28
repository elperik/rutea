package es.etic.rutea.persistence;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * Conexión SQLite del host e inicialización mínima del esquema.
 *
 * <p>El host es de un solo proceso y poco concurrente, por lo que se usa una
 * única conexión. El esquema se versiona en {@code schema_version} para futuras
 * migraciones.</p>
 */
public final class Database implements AutoCloseable {

    static final int SCHEMA_VERSION = 1;

    private final Connection connection;

    public Database(Path databaseFile) throws SQLException {
        ensureParent(databaseFile);
        this.connection = DriverManager.getConnection("jdbc:sqlite:" + databaseFile.toAbsolutePath());
        initSchema();
    }

    public Connection connection() {
        return connection;
    }

    private void initSchema() throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)");
            statement.execute(
                    "CREATE TABLE IF NOT EXISTS routine ("
                            + "id TEXT PRIMARY KEY, "
                            + "name TEXT NOT NULL, "
                            + "updated_at TEXT NOT NULL, "
                            + "data TEXT NOT NULL)");
            try (ResultSet rows = statement.executeQuery("SELECT COUNT(*) FROM schema_version")) {
                rows.next();
                if (rows.getInt(1) == 0) {
                    statement.execute("INSERT INTO schema_version(version) VALUES (" + SCHEMA_VERSION + ")");
                }
            }
        }
    }

    private static void ensureParent(Path databaseFile) throws SQLException {
        Path parent = databaseFile.toAbsolutePath().getParent();
        if (parent == null) {
            return;
        }
        try {
            Files.createDirectories(parent);
        } catch (IOException exception) {
            throw new SQLException("No se pudo crear el directorio de datos: " + parent, exception);
        }
    }

    @Override
    public void close() throws SQLException {
        connection.close();
    }
}
