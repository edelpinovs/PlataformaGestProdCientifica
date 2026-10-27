import path from "node:path";
import { defineConfig } from "vitest/config";

// Configuración de Vitest para el proyecto PGPC.
// Resuelve el alias @/* → src/* (igual que el tsconfig) para que las pruebas
// de reglas de negocio puedan importar utilidades de @/modules/catalogos/comun.
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
