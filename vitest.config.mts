import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: fileURLToPath(new URL("./", import.meta.url)) },
      // `server-only` tira error fuera de un Server Component; en tests se usa un módulo vacío.
      { find: "server-only", replacement: fileURLToPath(new URL("./test/server-only.ts", import.meta.url)) },
    ],
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
