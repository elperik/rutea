package es.etic.rutea;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import es.etic.rutea.messaging.MessageCodec;
import es.etic.rutea.messaging.MessageHandler;
import es.etic.rutea.messaging.SchemaValidator;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.UUID;

/**
 * Host de Chrome Native Messaging de Rutea.
 *
 * <p>Lee mensajes length-prefixed por stdin, los valida contra los contratos
 * compartidos y responde con un sobre estructurado por stdout. stdout queda
 * reservado al protocolo; el diagnóstico va a stderr.</p>
 */
public final class NativeHostMain {

    private final ObjectMapper mapper;
    private final MessageHandler handler;

    NativeHostMain(ObjectMapper mapper, MessageHandler handler) {
        this.mapper = mapper;
        this.handler = handler;
    }

    public static void main(String[] args) {
        ObjectMapper mapper = new ObjectMapper();
        MessageHandler handler =
                new MessageHandler(mapper, new SchemaValidator(), Clock.systemUTC());
        NativeHostMain host = new NativeHostMain(mapper, handler);
        try {
            host.run(System.in, System.out);
        } catch (IOException exception) {
            System.err.println("Rutea Native Host finalizado: " + exception.getMessage());
            System.exit(1);
        }
    }

    void run(InputStream input, OutputStream output) throws IOException {
        while (true) {
            byte[] raw = MessageCodec.readMessage(input);
            if (raw == null) {
                return;
            }
            JsonNode response = process(raw);
            MessageCodec.writeMessage(output, mapper.writeValueAsBytes(response));
        }
    }

    private JsonNode process(byte[] raw) {
        JsonNode request;
        try {
            request = mapper.readTree(new String(raw, StandardCharsets.UTF_8));
        } catch (JsonProcessingException exception) {
            return malformedJsonResponse();
        }
        if (request == null || !request.isObject()) {
            return malformedJsonResponse();
        }
        return handler.handle(request);
    }

    private JsonNode malformedJsonResponse() {
        ObjectNode response = mapper.createObjectNode();
        response.put("protocolVersion", MessageHandler.PROTOCOL_VERSION);
        response.put("correlationId", UUID.randomUUID().toString());
        response.put("timestamp", java.time.Instant.now().toString());
        response.put("ok", false);
        ObjectNode error = response.putObject("error");
        error.put("code", "VALIDATION_ERROR");
        error.put("message", "El cuerpo del mensaje no es JSON válido");
        return response;
    }
}
