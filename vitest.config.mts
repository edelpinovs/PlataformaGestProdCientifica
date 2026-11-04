import path from "node:path";
import { defineConfig } from "vitest/config";

// Alias @/ igual que tsconfig, para poder probar Server Actions (revisión del PR #66).
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
  },
});
