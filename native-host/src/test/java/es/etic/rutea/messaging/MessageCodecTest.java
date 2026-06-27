package es.etic.rutea.messaging;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class MessageCodecTest {

    @Test
    void escribeYReadRoundTrip() throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] body = "{\"type\":\"hello\"}".getBytes(StandardCharsets.UTF_8);

        MessageCodec.writeMessage(out, body);
        byte[] read = MessageCodec.readMessage(new ByteArrayInputStream(out.toByteArray()));

        assertThat(read).isEqualTo(body);
    }

    @Test
    void devuelveNullAlFinalizarElFlujo() throws IOException {
        byte[] read = MessageCodec.readMessage(new ByteArrayInputStream(new byte[0]));
        assertThat(read).isNull();
    }

    @Test
    void rechazaUnaLongitudExcesiva() {
        int oversize = MessageCodec.MAX_MESSAGE_BYTES + 1;
        byte[] header = {
            (byte) (oversize & 0xFF),
            (byte) ((oversize >> 8) & 0xFF),
            (byte) ((oversize >> 16) & 0xFF),
            (byte) ((oversize >> 24) & 0xFF)
        };

        assertThatThrownBy(() -> MessageCodec.readMessage(new ByteArrayInputStream(header)))
                .isInstanceOf(IOException.class)
                .hasMessageContaining("demasiado grande");
    }
}
