import { beforeEach, describe, expect, it, vi } from "vitest";
import { ejecutarEscaneo } from "./escaneo";
import { FUENTES_ESCANEO } from "./fuentes";

const conectores = vi.hoisted(() => ({ ORCID: vi.fn(), OPENALEX: vi.fn(), SCOPUS: vi.fn(), CROSSREF: vi.fn(), GOOGLE_SCHOLAR: vi.fn(), enriquecer: vi.fn() }));
vi.mock("./conectores/orcid",()=>({consultarOrcid:conectores.ORCID}));
vi.mock("./conectores/openalex",()=>({consultarOpenAlex:conectores.OPENALEX}));
vi.mock("./conectores/scopus",()=>({consultarScopus:conectores.SCOPUS}));
vi.mock("./conectores/crossref-busqueda",()=>({consultarCrossref:conectores.CROSSREF}));
vi.mock("./conectores/google-scholar",()=>({consultarGoogleScholar:conectores.GOOGLE_SCHOLAR}));
vi.mock("./conectores/crossref",()=>({enriquecerLoteConCrossref:conectores.enriquecer}));
function repositorio() { return { obtenerProfesores:vi.fn().mockResolvedValue([{id:1,nombres:"Persona",apellidos:"Ficticia",orcid:"0000-0000-0000-0001",scholarId:"DEMO_1",scopusId:"1"}]),buscarPorDoi:vi.fn(),buscarSimilares:vi.fn(),persistirOActualizar:vi.fn().mockResolvedValue(10),vincularAutoria:vi.fn().mockResolvedValue(true),obtenerUltimoCorte:vi.fn().mockResolvedValue(null),registrarCorte:vi.fn() }; }
beforeEach(()=>{vi.resetAllMocks(); for(const fuente of FUENTES_ESCANEO) conectores[fuente].mockResolvedValue({publicaciones:[{tipo:"ARTICULO",fuente,profesorId:1,titulo:"Obra ficticia de selección",autoresTexto:"Persona Ficticia",doi:"10.1000/fuentes-prueba",anio:2026}]});});

describe("orquestación de las cinco fuentes (#167)",()=>{
  for(let mascara=1;mascara<32;mascara++) {
    const fuentes=FUENTES_ESCANEO.filter((_,i)=>mascara&(1<<i));
    it(`consulta exclusivamente la combinación ${mascara}, sin enriquecimiento oculto`,async()=>{
      const repo=repositorio(); const resultado=await ejecutarEscaneo({fuentes:[...fuentes],anio:2026},repo);
      for(const fuente of FUENTES_ESCANEO) expect(conectores[fuente]).toHaveBeenCalledTimes(fuentes.includes(fuente)?1:0);
      expect(conectores.enriquecer).toHaveBeenCalledTimes(fuentes.includes("CROSSREF")?1:0);
      expect(repo.persistirOActualizar).toHaveBeenCalledOnce();
      expect(resultado.procedencia?.[0].fuentes.sort()).toEqual([...fuentes].sort());
      expect(resultado.consultasFuentes).toHaveLength(5);
    });
  }
  it("sin selección no consulta profesores ni proveedores",async()=>{
    const repo=repositorio();const resultado=await ejecutarEscaneo({fuentes:[]},repo);
    expect(repo.obtenerProfesores).not.toHaveBeenCalled();expect(resultado.errores).toEqual(["Selecciona al menos una fuente para iniciar la búsqueda."]);
  });
  it("un fallo de Google Scholar conserva su corte y deja avanzar ORCID",async()=>{
    conectores.GOOGLE_SCHOLAR.mockResolvedValue({publicaciones:[],error:"NO_API_KEY"});
    const repo=repositorio();const resultado=await ejecutarEscaneo({fuentes:["ORCID","GOOGLE_SCHOLAR"]},repo);
    expect(resultado.publicacionesGuardadas).toBe(1);
    expect(repo.registrarCorte).toHaveBeenCalledExactlyOnceWith(1,"ORCID",expect.any(Date));
    expect(resultado.consultasFuentes).toEqual(expect.arrayContaining([{profesorId:1,fuente:"GOOGLE_SCHOLAR",estado:"INCIDENCIA",cantidad:0},{profesorId:1,fuente:"SCOPUS",estado:"NO_SELECCIONADA",cantidad:0}]));
  });
  it("un resultado vacío es éxito sin resultados y avanza solo el corte de esa fuente",async()=>{
    conectores.CROSSREF.mockResolvedValue({publicaciones:[]});const repo=repositorio();
    const resultado=await ejecutarEscaneo({fuentes:["CROSSREF"],enriquecerAutores:false},repo);
    expect(resultado.consultasFuentes).toContainEqual({profesorId:1,fuente:"CROSSREF",estado:"SIN_RESULTADOS",cantidad:0});
    expect(repo.registrarCorte).toHaveBeenCalledExactlyOnceWith(1,"CROSSREF",expect.any(Date));
  });
});
