# Sitio de fixtures de Rutea

Aplicación web local, estática y determinista para probar grabación y, más adelante, ejecución de rutinas sin depender de webs reales. Cubre los patrones de `analisis/pendiente/007_ESTRATEGIA_DE_PRUEBAS.md` §3.

## Servir en local

Cualquier servidor estático sirve. Por ejemplo, desde la raíz del repositorio:

```powershell
npx --yes serve fixtures -l 4321
```

o con Python:

```powershell
python -m http.server 4321 --directory fixtures
```

Después abre `http://localhost:4321/`.

## Principios

- Sin red externa ni dependencias: todo es HTML, CSS y JS plano.
- Determinista: los identificadores "dinámicos" se derivan de una semilla fija (`?seed=`), de modo que un mismo `seed` produce el mismo DOM.
- Sin datos sensibles: ningún valor real, credencial ni token.

## Patrones disponibles

| Patrón | Dónde |
|---|---|
| Formulario con labels y ARIA | `index.html#formulario` |
| Campo contraseña (debe redactarse) | `index.html#formulario` |
| IDs dinámicos deterministas por `seed` | `index.html#dinamicos` |
| Lista que reordena elementos | `index.html#lista` |
| Shadow DOM abierto | `index.html#shadow` |
| iframe del mismo origen | `index.html` (carga `iframe.html`) |
| Navegación tipo SPA | `index.html#vista` |
| Modal | `index.html#modal` |
| Mensajes de éxito y error | `index.html#resultado` |
| Acción irreversible simulada | `index.html#irreversible` |
| CAPTCHA ficticio (debe pausar) | `index.html#captcha` |
| Elementos ambiguos (duplicados) | `index.html#ambiguo` |

## Rutina de ejemplo

[`examples/ejemplo-consulta.rutea.json`](examples/ejemplo-consulta.rutea.json) es una rutina válida e importable que opera sobre este sitio (`localhost`): rellena el formulario, marca el boletín, elige país y comprueba el mensaje de éxito. Impórtala desde el panel de Rutea (sección Biblioteca → Importar) y pulsa **Ejecutar** con los fixtures servidos en `http://localhost:4321/`. No contiene datos reales.
