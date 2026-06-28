package es.etic.rutea.persistence;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/** Implementación SQLite de {@link RoutineRepository}. La rutina se guarda como JSON. */
public final class SqliteRoutineRepository implements RoutineRepository {

    private final Connection connection;

    public SqliteRoutineRepository(Database database) {
        this.connection = database.connection();
    }

    @Override
    public void save(String id, String name, String json, String updatedAt) {
        String sql =
                "INSERT INTO routine(id, name, updated_at, data) VALUES(?, ?, ?, ?) "
                        + "ON CONFLICT(id) DO UPDATE SET name = excluded.name, "
                        + "updated_at = excluded.updated_at, data = excluded.data";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, id);
            statement.setString(2, name);
            statement.setString(3, updatedAt);
            statement.setString(4, json);
            statement.executeUpdate();
        } catch (SQLException exception) {
            throw new PersistenceException("No se pudo guardar la rutina " + id, exception);
        }
    }

    @Override
    public Optional<String> findJson(String id) {
        try (PreparedStatement statement =
                connection.prepareStatement("SELECT data FROM routine WHERE id = ?")) {
            statement.setString(1, id);
            try (ResultSet rows = statement.executeQuery()) {
                return rows.next() ? Optional.of(rows.getString(1)) : Optional.empty();
            }
        } catch (SQLException exception) {
            throw new PersistenceException("No se pudo leer la rutina " + id, exception);
        }
    }

    @Override
    public List<RoutineSummary> list() {
        List<RoutineSummary> summaries = new ArrayList<>();
        try (PreparedStatement statement =
                connection.prepareStatement(
                        "SELECT id, name, updated_at FROM routine ORDER BY name COLLATE NOCASE")) {
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    summaries.add(
                            new RoutineSummary(rows.getString(1), rows.getString(2), rows.getString(3)));
                }
            }
        } catch (SQLException exception) {
            throw new PersistenceException("No se pudo listar las rutinas", exception);
        }
        return summaries;
    }

    @Override
    public boolean delete(String id) {
        try (PreparedStatement statement =
                connection.prepareStatement("DELETE FROM routine WHERE id = ?")) {
            statement.setString(1, id);
            return statement.executeUpdate() > 0;
        } catch (SQLException exception) {
            throw new PersistenceException("No se pudo eliminar la rutina " + id, exception);
        }
    }
}
