import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/auth/roles";
import { getModulo } from "@/modules/registry";
import { puedeEscanear, ROLES_ESCANEO } from "./permisos";

describe("permisos del escaneo (#265, D-256)", () => {
  it.each([
    ["ADMINISTRADOR", true], ["COORDINADOR", true], ["DOCENTE", false],
  ] as const)("%s puede escanear: %s", (rol, esperado) => {
    expect(puedeEscanear(rol)).toBe(esperado);
  });

  it("cubre todos los roles conocidos y ninguno fuera del módulo de Producción", () => {
    expect(ROLES.filter(puedeEscanear)).toEqual([...ROLES_ESCANEO]);
    for (const rol of ROLES_ESCANEO) expect(getModulo("produccion").roles).toContain(rol);
  });
});
