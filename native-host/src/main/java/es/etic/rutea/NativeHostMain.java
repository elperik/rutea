package es.etic.rutea;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import es.etic.rutea.controlpanel.LocalControlPanelServer;
import es.etic.rutea.messaging.MessageCodec;
import es.etic.rutea.messaging.MessageHandler;
import es.etic.rutea.messaging.SchemaValidator;
import es.etic.rutea.persistence.Database;
import es.etic.rutea.persistence.SqliteRoutineRepository;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.SQLException;
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
        try (Database database = new Database(defaultDatabaseFile())) {
            SqliteRoutineRepository routines = new SqliteRoutineRepository(database);
            if (hasArg(args, "--panel")) {
                runControlPanel(mapper, routines, panelPort(args));
                return;
            }
            MessageHandler handler =
                    new MessageHandler(
                            mapper,
                            new SchemaValidator(),
                            Clock.systemUTC(),
                            routines);
            NativeHostMain host = new NativeHostMain(mapper, handler);
            host.run(System.in, System.out);
        } catch (IOException | SQLException | InterruptedException exception) {
            System.err.println("Rutea Native Host finalizado: " + exception.getMessage());
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            System.exit(1);
        }
    }

    private static void runControlPanel(ObjectMapper mapper, SqliteRoutineRepository routines, int port)
            throws IOException, InterruptedException {
        try (LocalControlPanelServer panel =
                new LocalControlPanelServer(mapper, routines, Clock.systemUTC(), port)) {
            panel.start();
            System.err.println("Rutea Panel local disponible en " + panel.uri());
            Thread.currentThread().join();
        }
    }

    private static boolean hasArg(String[] args, String expected) {
        for (String arg : args) {
            if (expected.equals(arg)) {
                return true;
            }
        }
        return false;
    }

    private static int panelPort(String[] args) {
        for (String arg : args) {
            if (arg.startsWith("--panel-port=")) {
                return Integer.parseInt(arg.substring("--panel-port=".length()));
            }
        }
        return LocalControlPanelServer.DEFAULT_PORT;
    }

    private static Path defaultDatabaseFile() {
        String localAppData = System.getenv("LOCALAPPDATA");
        Path base =
                localAppData != null && !localAppData.isBlank()
                        ? Path.of(localAppData, "Rutea")
                        : Path.of(System.getProperty("user.home"), ".rutea");
        return base.resolve("rutea.sqlite");
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
