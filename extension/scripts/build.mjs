// Empaqueta cada entrypoint de la extensión con esbuild.
// El service worker y el panel se cargan como módulos ES; el content script
// se inyecta como fichero suelto, por lo que se empaqueta como IIFE autocontenido.

import { build } from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");

const common = {
  bundle: true,
  sourcemap: true,
  target: "es2022",
  logLevel: "info",
  absWorkingDir: projectRoot
};

const targets = [
  {
    entry: "src/background/service-worker.ts",
    out: "dist/background/service-worker.js",
    format: "esm"
  },
  { entry: "src/sidepanel/main.ts", out: "dist/sidepanel/main.js", format: "esm" },
  { entry: "src/content/recorder.ts", out: "dist/content/recorder.js", format: "iife" },
  { entry: "src/content/player.ts", out: "dist/content/player.js", format: "iife" },
  { entry: "src/content/observer.ts", out: "dist/content/observer.js", format: "iife" }
];

await Promise.all(
  targets.map((target) =>
    build({
      ...common,
      entryPoints: [resolve(projectRoot, target.entry)],
      outfile: resolve(projectRoot, target.out),
      format: target.format
    })
  )
);

console.log("Extensión empaquetada en extension/dist");
