import { beforeEach, describe, expect, it, vi } from "vitest";
import { iniciarEscaneoAction } from "./actions";
import { resumenVacio } from "@/modules/produccion/lotes";

const dobles=vi.hoisted(()=>({permiso:vi.fn(),crear:vi.fn(),leer:vi.fn(),after:vi.fn(),procesar:vi.fn()}));
vi.mock("@/lib/auth/session",()=>({requireRol:dobles.permiso}));
vi.mock("@/lib/prisma",()=>({prisma:{job:{findFirst:dobles.leer}}}));
vi.mock("./trabajos",()=>({crearTrabajoEscaneo:dobles.crear,procesarSiguienteProfesor:dobles.procesar,TIPOS_ESCANEO:["escaneo-manual","escaneo-diario"]}));
vi.mock("next/server",()=>({after:dobles.after}));vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
beforeEach(()=>{vi.resetAllMocks();dobles.permiso.mockResolvedValue({rol:"COORDINADOR"});dobles.crear.mockResolvedValue({id:7,estado:"PENDIENTE",datos:{version:1,profesoresIds:[1],indice:0,fuentes:["ORCID"],resumen:resumenVacio()}});});

describe("selección de fuentes en Server Action (#167)",()=>{
  it("sin fuentes no crea trabajos ni agenda consultas",async()=>{
    const resultado=await iniciarEscaneoAction({},new FormData());expect(resultado.error).toBe("Selecciona al menos una fuente para iniciar la búsqueda.");
    expect(dobles.crear).not.toHaveBeenCalled();expect(dobles.after).not.toHaveBeenCalled();expect(dobles.permiso).toHaveBeenCalledWith(["COORDINADOR"]);
  });
  it("rechaza una fuente manipulada y conserva una selección válida normalizada",async()=>{
    const datos=new FormData();datos.append("fuentes","OTRA");expect((await iniciarEscaneoAction({},datos)).error).toBe("Selecciona una fuente válida.");
    datos.delete("fuentes");datos.append("fuentes","ORCID");datos.append("fuentes","ORCID");await iniciarEscaneoAction({},datos);
    expect(dobles.crear).toHaveBeenCalledExactlyOnceWith("escaneo-manual",undefined,undefined,["ORCID"]);
  });
  it("reanudar ignora fuentes enviadas por el navegador y usa la selección del trabajo",async()=>{
    const trabajo={id:7,estado:"PENDIENTE",avance:0,total:1,datos:{version:1,profesoresIds:[1],indice:0,fuentes:["ORCID"],resumen:resumenVacio()}};
    dobles.leer.mockResolvedValue(trabajo);const datos=new FormData();datos.set("jobId","7");datos.append("fuentes","GOOGLE_SCHOLAR");
    expect((await iniciarEscaneoAction({},datos)).fuentes).toEqual(["ORCID"]);expect(dobles.crear).not.toHaveBeenCalled();
  });
  it("un rol no autorizado se rechaza antes de leer selecciones o trabajos",async()=>{
    dobles.permiso.mockRejectedValue(new Error("Sin permiso"));await expect(iniciarEscaneoAction({},new FormData())).rejects.toThrow("Sin permiso");expect(dobles.leer).not.toHaveBeenCalled();expect(dobles.crear).not.toHaveBeenCalled();
  });
});
