package es.etic.rutea.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Valida nodos JSON contra los esquemas canónicos de {@code shared/}, empaquetados
 * como recursos del classpath bajo {@code /schemas/}. Es el control de frontera del
 * host: ningún mensaje de la extensión se procesa sin validarse antes.
 */
public final class SchemaValidator {

    private final JsonSchema nativeMessageSchema;
    private final JsonSchema nativeResponseSchema;
    private final JsonSchema helloRequestSchema;
    private final JsonSchema routineSchema;

    public SchemaValidator() {
        JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
        this.nativeMessageSchema = load(factory, "/schemas/contracts/native-message.schema.json");
        this.nativeResponseSchema = load(factory, "/schemas/contracts/native-response.schema.json");
        this.routineSchema = load(factory, "/schemas/routine.schema.json");
        this.helloRequestSchema =
                loadSubschema(factory, "/schemas/contracts/hello.schema.json", "helloRequest");
    }

    public List<String> validateNativeMessage(JsonNode node) {
        return collect(nativeMessageSchema.validate(node));
    }

    public List<String> validateNativeResponse(JsonNode node) {
        return collect(nativeResponseSchema.validate(node));
    }

    public List<String> validateHelloRequest(JsonNode node) {
        return collect(helloRequestSchema.validate(node));
    }

    public List<String> validateRoutine(JsonNode node) {
        return collect(routineSchema.validate(node));
    }

    private static List<String> collect(Set<ValidationMessage> messages) {
        List<String> result = new ArrayList<>(messages.size());
        for (ValidationMessage message : messages) {
            result.add(message.getMessage());
        }
        return result;
    }

    private static JsonSchema load(JsonSchemaFactory factory, String resource) {
        try (InputStream stream = open(resource)) {
            return factory.getSchema(stream);
        } catch (IOException exception) {
            throw new UncheckedIOException("No se pudo cargar el esquema " + resource, exception);
        }
    }

    private static JsonSchema loadSubschema(JsonSchemaFactory factory, String resource, String def) {
        try (InputStream stream = open(resource)) {
            JsonNode root = com.fasterxml.jackson.databind.json.JsonMapper.builder()
                    .build()
                    .readTree(stream);
            JsonNode subschema = root.path("$defs").path(def);
            if (subschema.isMissingNode()) {
                throw new IllegalStateException("Falta $defs/" + def + " en " + resource);
            }
            return factory.getSchema(subschema);
        } catch (IOException exception) {
            throw new UncheckedIOException("No se pudo cargar el esquema " + resource, exception);
        }
    }

    private static InputStream open(String resource) {
        InputStream stream = SchemaValidator.class.getResourceAsStream(resource);
        if (stream == null) {
            throw new IllegalStateException("Recurso de esquema no encontrado: " + resource);
        }
        return stream;
    }
}
