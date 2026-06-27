import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const source = resolve(projectRoot, "static");
const destination = resolve(projectRoot, "dist");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });

console.log("Archivos estáticos copiados a extension/dist");
