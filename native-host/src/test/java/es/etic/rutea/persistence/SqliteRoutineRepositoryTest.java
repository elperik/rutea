package es.etic.rutea.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.sql.SQLException;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class SqliteRoutineRepositoryTest {

    @TempDir Path tempDir;

    private Database database;
    private SqliteRoutineRepository repository;

    @BeforeEach
    void setUp() throws SQLException {
        database = new Database(tempDir.resolve("rutea.sqlite"));
        repository = new SqliteRoutineRepository(database);
    }

    @AfterEach
    void tearDown() throws SQLException {
        database.close();
    }

    @Test
    void guardaYRecuperaUnaRutina() {
        repository.save("id-1", "Alta", "{\"id\":\"id-1\"}", "2026-06-28T10:00:00Z");

        Optional<String> json = repository.findJson("id-1");
        assertThat(json).contains("{\"id\":\"id-1\"}");
        assertThat(repository.list()).singleElement().satisfies(summary -> {
            assertThat(summary.id()).isEqualTo("id-1");
            assertThat(summary.name()).isEqualTo("Alta");
        });
    }

    @Test
    void elUpsertReemplazaPorId() {
        repository.save("id-1", "Alta", "{\"v\":1}", "2026-06-28T10:00:00Z");
        repository.save("id-1", "Alta editada", "{\"v\":2}", "2026-06-28T11:00:00Z");

        assertThat(repository.list()).hasSize(1);
        assertThat(repository.findJson("id-1")).contains("{\"v\":2}");
    }

    @Test
    void eliminaUnaRutina() {
        repository.save("id-1", "Alta", "{}", "2026-06-28T10:00:00Z");
        assertThat(repository.delete("id-1")).isTrue();
        assertThat(repository.delete("id-1")).isFalse();
        assertThat(repository.findJson("id-1")).isEmpty();
    }

    @Test
    void listaVaciaAlInicio() {
        assertThat(repository.list()).isEmpty();
    }
}
