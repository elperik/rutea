import { beforeEach, describe, expect, it } from "vitest";

import { validateScreenContext } from "../contracts/index.js";
import { buildScreenContext } from "./screen-context.js";

const fixedDate = new Date("2026-06-28T12:00:00.000Z");

describe("ScreenContext reducer", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.title = "Fixture";
    window.history.replaceState({}, "", "http://localhost:3000/inicio.php");
  });

  it("extrae controles semanticos, acciones y tablas de una pantalla GPEX anonima", async () => {
    document.title = "Datos gestion / revision / mensual";
    document.body.innerHTML = `
      <form aria-label="Busqueda">
        <label>Mes
          <select id="mes" name="mes">
            <option value="05">Mayo</option>
            <option value="06">Junio</option>
          </select>
        </label>
        <label>Firmadas
          <select id="firmadas" name="firmadas">
            <option>Mes Enviado</option>
            <option selected>Mes No Firmado</option>
          </select>
        </label>
        <button id="buscar" type="submit">Buscar</button>
      </form>
      <table aria-label="Resultados">
        <thead>
          <tr><th>Codigo</th><th>Apellidos</th><th>Seleccionar</th><th>Firmado</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>743</td><td>Persona anonimizada</td>
            <td><a id="lupa-743" href="/detalle.php?id=743">Lupa</a></td>
            <td>No</td>
          </tr>
        </tbody>
      </table>
    `;

    const context = await buildScreenContext({ now: fixedDate });

    expect(validateScreenContext(context).ok).toBe(true);
    expect(context.url).toBe("http://localhost:3000/inicio.php");
    expect(context.title).toBe("Datos gestion / revision / mensual");
    expect(context.contextHash).toMatch(/^[a-f0-9]{64}$/);

    expect(context.controls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "select",
          label: "Mes",
          value: "Mayo",
          options: ["Mayo", "Junio"]
        }),
        expect.objectContaining({
          kind: "select",
          label: "Firmadas",
          value: "Mes No Firmado",
          options: ["Mes Enviado", "Mes No Firmado"]
        }),
        expect.objectContaining({ kind: "button", text: "Buscar" }),
        expect.objectContaining({ kind: "link", text: "Lupa" })
      ])
    );

    expect(context.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "select", description: "Seleccionar Mes" }),
        expect.objectContaining({ kind: "select", description: "Seleccionar Firmadas" }),
        expect.objectContaining({ kind: "click", description: "Pulsar Buscar" }),
        expect.objectContaining({ kind: "click", description: "Pulsar Lupa" })
      ])
    );

    expect(context.tables).toHaveLength(1);
    expect(context.tables[0]).toEqual(
      expect.objectContaining({
        label: "Resultados",
        columns: ["Codigo", "Apellidos", "Seleccionar", "Firmado"],
        rowCountVisible: 1,
        truncated: false
      })
    );
    expect(context.tables[0]?.rowsPreview[0]?.cells).toEqual(
      expect.objectContaining({
        Codigo: "743",
        Apellidos: "Persona anonimizada",
        Firmado: "No"
      })
    );
  });

  it("redacta secretos e identificadores personales antes de construir el contexto", async () => {
    document.body.innerHTML = `
      <label>Clave <input id="password" type="password" value="supersecreto"></label>
      <label>Email <input id="email" value="persona@example.com"></label>
      <p>Telefono 612 345 678 y DNI 12345678Z</p>
      <button>Enviar</button>
    `;

    const context = await buildScreenContext({ now: fixedDate });
    const serialized = JSON.stringify(context);

    expect(serialized).not.toContain("supersecreto");
    expect(serialized).not.toContain("persona@example.com");
    expect(serialized).not.toContain("612 345 678");
    expect(serialized).not.toContain("12345678Z");
    expect(context.redactions).toEqual(
      expect.arrayContaining([
        { kind: "dni", count: 1 },
        { kind: "email", count: 1 },
        { kind: "password", count: 1 },
        { kind: "phone", count: 1 }
      ])
    );
  });

  it("marca truncado cuando supera limites configurados", async () => {
    document.body.innerHTML = `
      <button>Uno</button>
      <button>Dos</button>
      <p>${"texto ".repeat(100)}</p>
    `;

    const context = await buildScreenContext({
      now: fixedDate,
      maxControls: 1,
      maxTextSummaryChars: 20
    });

    expect(context.controls).toHaveLength(1);
    expect(context.truncated).toBe(true);
    expect(context.textSummary?.length).toBeLessThanOrEqual(20);
  });
});
