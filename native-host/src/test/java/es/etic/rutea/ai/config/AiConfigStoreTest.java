package es.etic.rutea.ai.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import es.etic.rutea.messaging.SchemaValidator;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class AiConfigStoreTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final SchemaValidator VALIDATOR = new SchemaValidator();

    @TempDir
    Path tempDir;

    private Path file;

    @BeforeEach
    void setUp() {
        file = tempDir.resolve("ai-config.json");
    }

    private AiConfigStore store() {
        return new AiConfigStore(MAPPER, VALIDATOR, file);
    }

    @Test
    void sirveCatalogoPorDefectoSiNoHayFichero() {
        AiConfigStore.Loaded loaded = store().load();

        assertThat(loaded.fromFile()).isFalse();
        assertThat(loaded.config().providers().size()).isGreaterThanOrEqualTo(2);
        assertThat(loaded.config().selection().main().provider()).isEqualTo("fake");
        assertThat(loaded.secrets().providerIds()).isEmpty();
        assertThat(loaded.config().referenceErrors()).isEmpty();
    }

    @Test
    void separaLasClavesDelCatalogoAlCargar() throws Exception {
        write("""
            {
              "schemaVersion": 1,
              "providers": [
                {
                  "id": "openrouter",
                  "name": "OpenRouter",
                  "kind": "openai-compatible",
                  "apiBaseUrl": "https://openrouter.ai/api/v1/chat/completions",
                  "apiKey": "sk-secreta-123",
                  "models": [ { "id": "openrouter/free", "name": "Free" } ]
                }
              ],
              "selection": { "main": { "provider": "openrouter", "model": "openrouter/free" } }
            }
            """);

        AiConfigStore.Loaded loaded = store().load();

        assertThat(loaded.fromFile()).isTrue();
        assertThat(loaded.secrets().has("openrouter")).isTrue();
        assertThat(loaded.secrets().get("openrouter")).hasValue("sk-secreta-123");
        // El catalogo en memoria no debe arrastrar la clave en su representacion.
        assertThat(loaded.config().toString()).doesNotContain("sk-secreta-123");
    }

    @Test
    void rechazaConfiguracionInvalidaSegunEsquema() throws Exception {
        write("{ \"schemaVersion\": 1, \"providers\": [] }");

        assertThatThrownBy(() -> store().load())
                .isInstanceOf(AiConfigException.class)
                .hasMessageContaining("esquema");
    }

    @Test
    void rechazaSeleccionConReferenciaInexistente() throws Exception {
        write("""
            {
              "schemaVersion": 1,
              "providers": [
                { "id": "fake", "name": "Fake", "kind": "fake",
                  "models": [ { "id": "fake-structured", "name": "Fake" } ] }
              ],
              "selection": { "main": { "provider": "fake", "model": "no-existe" } }
            }
            """);

        assertThatThrownBy(() -> store().load())
                .isInstanceOf(AiConfigException.class)
                .hasMessageContaining("incoherentes");
    }

    @Test
    void guardaFusionandoClaveYRecargaConSecretoSeparado() throws Exception {
        AiConfigStore store = store();
        AiConfig base = store.defaultConfig();
        AiConfigSecrets secrets = AiConfigSecrets.empty().with("github", "ghp-clave-xyz");

        store.save(base, secrets);

        String raw = Files.readString(file, StandardCharsets.UTF_8);
        assertThat(raw).contains("ghp-clave-xyz");

        AiConfigStore.Loaded reloaded = store.load();
        assertThat(reloaded.fromFile()).isTrue();
        assertThat(reloaded.secrets().get("github")).hasValue("ghp-clave-xyz");
        assertThat(reloaded.config().provider("github")).isPresent();
    }

    @Test
    void elFicheroPorDefectoEmpaquetadoNoTieneClaves() {
        // defaultConfig se carga del recurso empaquetado; nunca debe traer secretos.
        AiConfigStore.Loaded loaded = store().load();
        assertThat(loaded.secrets().providerIds()).isEmpty();
    }

    private void write(String json) throws Exception {
        Files.writeString(file, json, StandardCharsets.UTF_8);
    }
}
