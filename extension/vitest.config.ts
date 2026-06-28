import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // El player toca el DOM: sus pruebas usan happy-dom; el resto, Node.
    environmentMatchGlobs: [["**/player-core.test.ts", "happy-dom"]]
  }
});
