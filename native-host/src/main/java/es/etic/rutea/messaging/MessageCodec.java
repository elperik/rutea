package es.etic.rutea.messaging;

import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * Lectura y escritura del marco length-prefixed de Chrome Native Messaging.
 *
 * <p>La longitud es un entero de 32 bits little-endian seguido del cuerpo UTF-8.
 * stdout queda reservado al protocolo; cualquier diagnóstico va a stderr.</p>
 */
public final class MessageCodec {

    public static final int MAX_MESSAGE_BYTES = 1_048_576;

    private MessageCodec() {
    }

    /**
     * Lee un mensaje completo o devuelve {@code null} si el flujo terminó limpiamente.
     */
    public static byte[] readMessage(InputStream input) throws IOException {
        int length = readLittleEndianLength(input);
        if (length < 0) {
            return null;
        }
        if (length > MAX_MESSAGE_BYTES) {
            throw new IOException("Mensaje demasiado grande: " + length + " bytes");
        }

        byte[] payload = input.readNBytes(length);
        if (payload.length != length) {
            throw new EOFException("Mensaje incompleto");
        }
        return payload;
    }

    public static void writeMessage(OutputStream output, byte[] body) throws IOException {
        int length = body.length;
        if (length > MAX_MESSAGE_BYTES) {
            throw new IOException("Respuesta demasiado grande: " + length + " bytes");
        }
        output.write(length & 0xFF);
        output.write((length >> 8) & 0xFF);
        output.write((length >> 16) & 0xFF);
        output.write((length >> 24) & 0xFF);
        output.write(body);
        output.flush();
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
}
