package es.etic.rutea.ai.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import es.etic.rutea.messaging.SchemaValidator;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Lee, valida y guarda la configuracion IA local del host.
 *
 * <p>El fichero local (estilo 'track', gitignored) reune catalogo y claves. Al cargar,
 * las claves se separan a {@link AiConfigSecrets} y el {@link AiConfig} resultante no
 * las contiene; al guardar, se vuelven a fusionar. Si el fichero no existe se devuelve
 * un catalogo por defecto sin secretos.</p>
 */
public final class AiConfigStore {

    /** Version actual del esquema de configuracion. */
    public static final int SCHEMA_VERSION = 1;

    private final ObjectMapper mapper;
    private final SchemaValidator validator;
    private final Path file;

    public AiConfigStore(ObjectMapper mapper, SchemaValidator validator, Path file) {
        this.mapper = mapper;
        this.validator = validator;
        this.file = file;
    }

    public Path file() {
        return file;
    }

    /** Resultado de cargar la configuracion: catalogo, secretos separados y procedencia. */
    public record Loaded(AiConfig config, AiConfigSecrets secrets, boolean fromFile, Path file) {
    }

    public Loaded load() {
        if (!Files.exists(file)) {
            return new Loaded(defaultConfig(), AiConfigSecrets.empty(), false, file);
        }
        JsonNode root;
        try {
            root = mapper.readTree(Files.readAllBytes(file));
        } catch (IOException exception) {
            throw new AiConfigException("No se pudo leer la configuracion IA local", exception);
        }
        List<String> schemaErrors = validator.validateAiConfig(root);
        if (!schemaErrors.isEmpty()) {
            throw new AiConfigException("Configuracion IA invalida segun el esquema", schemaErrors);
        }
        Parsed parsed = parse(root);
        List<String> refErrors = parsed.config().referenceErrors();
        if (!refErrors.isEmpty()) {
            throw new AiConfigException("Configuracion IA con referencias incoherentes", refErrors);
        }
        return new Loaded(parsed.config(), parsed.secrets(), true, file);
    }

    public void save(AiConfig config, AiConfigSecrets secrets) {
        List<String> refErrors = config.referenceErrors();
        if (!refErrors.isEmpty()) {
            throw new AiConfigException("Configuracion IA con referencias incoherentes", refErrors);
        }
        ObjectNode root = toJson(config, secrets);
        List<String> schemaErrors = validator.validateAiConfig(root);
        if (!schemaErrors.isEmpty()) {
            throw new AiConfigException("Configuracion IA generada invalida segun el esquema", schemaErrors);
        }
        try {
            Path parent = file.toAbsolutePath().getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            byte[] bytes = mapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(root);
            Path tmp = file.resolveSibling(file.getFileName() + ".tmp");
            Files.write(tmp, bytes);
            Files.move(tmp, file, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException exception) {
            throw new AiConfigException("No se pudo guardar la configuracion IA local", exception);
        }
    }

    private record Parsed(AiConfig config, AiConfigSecrets secrets) {
    }

    private Parsed parse(JsonNode root) {
        Map<String, String> keys = new LinkedHashMap<>();
        List<AiProvider> providers = new ArrayList<>();
        for (JsonNode providerNode : root.path("providers")) {
            String id = providerNode.path("id").asText();
            AiProviderKind kind = AiProviderKind.fromWire(providerNode.path("kind").asText());
            String apiBaseUrl = providerNode.hasNonNull("apiBaseUrl") ? providerNode.get("apiBaseUrl").asText() : null;
            if (providerNode.hasNonNull("apiKey")) {
                String key = providerNode.get("apiKey").asText();
                if (!key.isBlank()) {
                    keys.put(id, key);
                }
            }
            List<AiModel> models = new ArrayList<>();
            for (JsonNode modelNode : providerNode.path("models")) {
                models.add(new AiModel(
                        modelNode.path("id").asText(),
                        modelNode.path("name").asText(),
                        modelNode.path("vision").asBoolean(false),
                        modelNode.path("streaming").asBoolean(false),
                        modelNode.path("structuredOutputs").asBoolean(false),
                        modelNode.path("toolCalling").asBoolean(false),
                        modelNode.hasNonNull("notes") ? modelNode.get("notes").asText() : null,
                        modelNode.hasNonNull("params") ? modelNode.get("params") : null));
            }
            providers.add(new AiProvider(id, providerNode.path("name").asText(), kind, apiBaseUrl, models));
        }
        AiSelection selection = parseSelection(root.path("selection"));
        AiConfig config = new AiConfig(root.path("schemaVersion").asInt(SCHEMA_VERSION), providers, selection);
        return new Parsed(config, new AiConfigSecrets(keys));
    }

    private AiSelection parseSelection(JsonNode node) {
        return new AiSelection(ref(node.path("main")), ref(node.path("fallback1")), ref(node.path("fallback2")));
    }

    private AiSelectionRef ref(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return null;
        }
        return new AiSelectionRef(node.path("provider").asText(), node.path("model").asText());
    }

    /** Serializa catalogo + claves al formato de fichero (con secretos inline). */
    ObjectNode toJson(AiConfig config, AiConfigSecrets secrets) {
        ObjectNode root = mapper.createObjectNode();
        root.put("schemaVersion", config.schemaVersion());
        ArrayNode providers = root.putArray("providers");
        for (AiProvider provider : config.providers()) {
            ObjectNode providerNode = providers.addObject();
            providerNode.put("id", provider.id());
            providerNode.put("name", provider.name());
            providerNode.put("kind", provider.kind().wireValue());
            if (provider.apiBaseUrl() != null) {
                providerNode.put("apiBaseUrl", provider.apiBaseUrl());
            }
            secrets.get(provider.id()).ifPresent(key -> providerNode.put("apiKey", key));
            ArrayNode models = providerNode.putArray("models");
            for (AiModel model : provider.models()) {
                ObjectNode modelNode = models.addObject();
                modelNode.put("id", model.id());
                modelNode.put("name", model.name());
                modelNode.put("vision", model.vision());
                modelNode.put("streaming", model.streaming());
                modelNode.put("structuredOutputs", model.structuredOutputs());
                modelNode.put("toolCalling", model.toolCalling());
                if (model.notes() != null) {
                    modelNode.put("notes", model.notes());
                }
                if (model.params() != null && !model.params().isNull()) {
                    modelNode.set("params", model.params());
                }
            }
        }
        ObjectNode selection = root.putObject("selection");
        putRef(selection, "main", config.selection().main());
        putRef(selection, "fallback1", config.selection().fallback1());
        putRef(selection, "fallback2", config.selection().fallback2());
        return root;
    }

    private void putRef(ObjectNode parent, String field, AiSelectionRef ref) {
        if (ref == null) {
            return;
        }
        ObjectNode node = parent.putObject(field);
        node.put("provider", ref.provider());
        node.put("model", ref.model());
    }

    /**
     * Catalogo por defecto inspirado en 'track' (GitHub Models, NVIDIA NIM, OpenRouter,
     * Gemini) mas el backend offline {@code fake}. Sin claves: los endpoints reales
     * requieren que el usuario aporte su clave por el panel antes de usarse.
     */
    public AiConfig defaultConfig() {
        try {
            JsonNode root = mapper.readTree(
                    AiConfigStore.class.getResourceAsStream("/schemas-local/ai-config.default.json"));
            return parse(root).config();
        } catch (IOException | NullPointerException exception) {
            throw new UncheckedIOException(
                    new IOException("No se pudo cargar el catalogo IA por defecto", exception));
        }
    }
}
