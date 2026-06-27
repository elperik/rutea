package es.etic.rutea;

import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

/**
 * Host mínimo de Chrome Native Messaging.
 *
 * <p>stdout queda reservado exclusivamente para mensajes con prefijo de longitud.
 * Cualquier diagnóstico debe escribirse en stderr.</p>
 */
public final class NativeHostMain {

    private static final int MAX_MESSAGE_BYTES = 1_048_576;

    private NativeHostMain() {
    }

    public static void main(String[] args) {
        try {
            run(System.in, System.out);
        } catch (Exception exception) {
            System.err.println("Rutea Native Host finalizado: " + exception.getMessage());
            System.exit(1);
        }
    }

    static void run(InputStream input, OutputStream output) throws IOException {
        while (true) {
            int length = readLittleEndianLength(input);
            if (length < 0) {
                return;
            }
            if (length > MAX_MESSAGE_BYTES) {
                throw new IOException("Mensaje demasiado grande: " + length + " bytes");
            }

            byte[] payload = input.readNBytes(length);
            if (payload.length != length) {
                throw new EOFException("Mensaje incompleto");
            }

            String request = new String(payload, StandardCharsets.UTF_8);
            String response = buildResponse(request.length());
            writeMessage(output, response);
        }
    }

    private static String buildResponse(int requestLength) {
        return "{\"ok\":true,\"protocolVersion\":1,\"service\":\"rutea-native-host\",\"requestLength\":"
                + requestLength
                + "}";
    }

    private static int readLittleEndianLength(InputStream input) throws IOException {
        int first = input.read();
        if (first < 0) {
            return -1;
        }

        int second = requireByte(input.read());
        int third = requireByte(input.read());
        int fourth = requireByte(input.read());

        return first | (second << 8) | (third << 16) | (fourth << 24);
    }

    private static int requireByte(int value) throws EOFException {
        if (value < 0) {
            throw new EOFException("Cabecera Native Messaging incompleta");
        }
        return value;
    }

    private static void writeMessage(OutputStream output, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        int length = bytes.length;

        output.write(length & 0xFF);
        output.write((length >> 8) & 0xFF);
        output.write((length >> 16) & 0xFF);
        output.write((length >> 24) & 0xFF);
        output.write(bytes);
        output.flush();
    }
}
