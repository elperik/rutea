// Genera, desde los esquemas JSON canónicos de `shared/`:
//   1. validadores standalone (JS sin `eval`, compatibles con la CSP de Manifest V3);
//   2. tipos TypeScript equivalentes.
// Es la materialización de la decisión "JSON Schema como fuente de verdad" (009_CIERRE_FASE_0).

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import standaloneModule from "ajv/dist/standalone/index.js";
import { compile as compileType } from "json-schema-to-typescript";

const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;
const addFormats = addFormatsModule.default ?? addFormatsModule;
const standaloneCode = standaloneModule.default ?? standaloneModule;

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sharedDir = resolve(scriptDir, "../../shared");
const outDir = resolve(scriptDir, "../src/contracts");

const schemaFiles = {
  nativeMessage: "contracts/native-message.schema.json",
  nativeResponse: "contracts/native-response.schema.json",
  hello: "contracts/hello.schema.json",
  routine: "routine.schema.json",
  routineExport: "contracts/routine-export.schema.json",
  screenContext: "contracts/screen-context.schema.json",
  aiNavigationRequest: "contracts/ai-navigation-request.schema.json",
  aiNavigationProposal: "contracts/ai-navigation-proposal.schema.json"
};

async function loadSchema(relativePath) {
  const absolute = resolve(sharedDir, relativePath);
  return JSON.parse(await readFile(absolute, "utf8"));
}

async function main() {
  const schemas = {};
  for (const [key, file] of Object.entries(schemaFiles)) {
    schemas[key] = await loadSchema(file);
  }

  const ajv = new Ajv2020({
    strict: false,
    allErrors: true,
    code: { source: true, esm: true }
  });
  addFormats(ajv);

  for (const schema of Object.values(schemas)) {
    ajv.addSchema(schema);
  }

  // Cada entrada se convierte en un export con nombre del módulo generado.
  const validatorRefs = {
    nativeMessage: schemas.nativeMessage.$id,
    nativeResponse: schemas.nativeResponse.$id,
    routine: schemas.routine.$id,
    routineExport: schemas.routineExport.$id,
    screenContext: schemas.screenContext.$id,
    aiNavigationRequest: schemas.aiNavigationRequest.$id,
    aiNavigationProposal: schemas.aiNavigationProposal.$id,
    helloRequest: `${schemas.hello.$id}#/$defs/helloRequest`,
    helloResult: `${schemas.hello.$id}#/$defs/helloResult`
  };

  await mkdir(outDir, { recursive: true });
  const validatorSource = standaloneCode(ajv, validatorRefs);
  const generatedHeader =
    "// Archivo generado por scripts/generate-contracts.mjs. No editar a mano.\n";
  await writeFile(
    resolve(outDir, "validators.generated.js"),
    generatedHeader + validatorSource,
    "utf8"
  );

  const validatorNames = Object.keys(validatorRefs);
  const dtsBody = [
    generatedHeader,
    "export interface StandaloneValidator {",
    "  (data: unknown): boolean;",
    "  errors?: ReadonlyArray<{",
    "    instancePath: string;",
    "    schemaPath: string;",
    "    keyword: string;",
    "    message?: string;",
    "    params: Record<string, unknown>;",
    "  }> | null;",
    "}",
    "",
    ...validatorNames.map((name) => `export const ${name}: StandaloneValidator;`),
    ""
  ].join("\n");
  await writeFile(resolve(outDir, "validators.generated.d.ts"), dtsBody, "utf8");

  // Tipos con nombres estables, independientes del `title` de cada esquema.
  const typeTargets = [
    { name: "NativeMessage", schema: schemas.nativeMessage },
    { name: "NativeResponse", schema: schemas.nativeResponse },
    { name: "Routine", schema: schemas.routine },
    { name: "RoutineExport", schema: schemas.routineExport },
    { name: "ScreenContext", schema: schemas.screenContext },
    {
      name: "AiNavigationRequest",
      schema: bundleExternalSchema(
        schemas.aiNavigationRequest,
        "screenContext",
        schemas.screenContext
      )
    },
    { name: "AiNavigationProposal", schema: schemas.aiNavigationProposal },
    { name: "HelloRequest", schema: withRoot(schemas.hello, schemas.hello.$defs.helloRequest) },
    { name: "HelloResult", schema: withRoot(schemas.hello, schemas.hello.$defs.helloResult) }
  ];

  const typeBlocks = [];
  for (const target of typeTargets) {
    const ts = await compileType(stripNaming(target.schema), target.name, {
      bannerComment: "",
      additionalProperties: false,
      declareExternallyReferenced: true,
      $refOptions: { resolve: { http: false } }
    });
    typeBlocks.push(ts.trim());
  }

  const typesHeader =
    "// Tipos generados por scripts/generate-contracts.mjs desde shared/. No editar a mano.\n\n";
  await writeFile(
    resolve(outDir, "types.ts"),
    typesHeader + typeBlocks.join("\n\n") + "\n",
    "utf8"
  );

  console.log("Contratos generados en extension/src/contracts/");
}

// Devuelve un subesquema como documento raíz, conservando $schema para la generación de tipos.
function withRoot(parent, subschema) {
  return { $schema: parent.$schema, ...subschema };
}

// Inserta un esquema externo en `$defs` para que json-schema-to-typescript no necesite HTTP.
function bundleExternalSchema(schema, propertyName, referencedSchema) {
  const clone = structuredClone(schema);
  const bundled = structuredClone(referencedSchema);
  delete bundled.$schema;
  delete bundled.$id;
  delete bundled.title;
  clone.$defs = { ...clone.$defs, [propertyName]: bundled };
  clone.properties[propertyName] = { $ref: `#/$defs/${propertyName}` };
  return clone;
}

// Elimina title/$id para que el nombre del tipo lo fije el generador, no el esquema.
function stripNaming(schema) {
  const clone = { ...schema };
  delete clone.title;
  delete clone.$id;
  return clone;
}

main().catch((error) => {
  console.error("Fallo al generar contratos:", error);
  process.exit(1);
});
