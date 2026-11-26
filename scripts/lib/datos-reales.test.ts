import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { leerPaquete2027 } from "./datos-reales";

describe("leerPaquete2027", () => {
  it("avisa en español cuando la carpeta no existe", () => {
    expect(() => leerPaquete2027(path.join(tmpdir(), "no-existe-pgpc-2027"))).toThrow(/No existe la carpeta/);
  });

  it("se niega a leer de una carpeta que git no ignora", () => {
    const carpeta = mkdtempSync(path.join(tmpdir(), "pgpc-prueba-"));
    try {
      expect(() => leerPaquete2027(carpeta)).toThrow(/NO está ignorada por git/);
    } finally {
      rmSync(carpeta, { recursive: true, force: true });
    }
  });
});
