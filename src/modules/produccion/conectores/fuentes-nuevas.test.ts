import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultarCrossref, coincideAutorCrossref } from "./crossref-busqueda";
import { consultarGoogleScholar } from "./google-scholar";
import { fetchJsonConReintentos } from "./http";
vi.mock("./http",()=>({fetchJsonConReintentos:vi.fn()}));
const http=vi.mocked(fetchJsonConReintentos);
const profesor={id:1,nombres:"Persona",apellidos:"Ficticia",orcid:"0000-0000-0000-0001",scholarId:"DEMO_1"};
const obra={DOI:"10.1000/ficticia",title:["Obra ficticia"],type:"journal-article",author:[{given:"Persona",family:"Ficticia",ORCID:"https://orcid.org/0000-0000-0000-0001"}],published:{"date-parts":[[2026]]}};
function respuesta(data:unknown){return {data,status:200,headers:new Headers()};}
beforeEach(()=>vi.resetAllMocks());

describe("Crossref como fuente independiente (#167)",()=>{
  it("pagina por cursor con filtro de ORCID y periodo, y normaliza metadatos",async()=>{
    http.mockResolvedValueOnce(respuesta({message:{items:Array.from({length:100},()=>obra),"next-cursor":"pagina-2"}})).mockResolvedValueOnce(respuesta({message:{items:[{...obra,DOI:"10.1000/otra"}]}}));
    const resultado=await consultarCrossref(profesor,2025,2026);
    expect(resultado.publicaciones).toHaveLength(101);expect(resultado.publicaciones[0]).toMatchObject({fuente:"CROSSREF",doi:"10.1000/ficticia",profesorId:1,anio:2026});
    expect(http.mock.calls[0][1]?.params?.filter).toBe("orcid:0000-0000-0000-0001,from-pub-date:2025-01-01,until-pub-date:2026-12-31");
    expect(http.mock.calls[1][1]?.params?.cursor).toBe("pagina-2");
  });
  it("descarta resultados con otro ORCID aunque coincida el nombre; admite candidatos por nombre sin identificador",()=>{
    expect(coincideAutorCrossref([{given:"Persona",family:"Ficticia",ORCID:"https://orcid.org/0000-0000-0000-0002"}],profesor)).toBe(false);
    expect(coincideAutorCrossref([{given:"Persona",family:"Ficticia"}],{...profesor,orcid:null})).toBe(true);
    expect(coincideAutorCrossref([{given:"Otra",family:"Persona"}],profesor)).toBe(false);
  });
  it("un fallo intermedio no devuelve una consulta parcial como completa",async()=>{
    http.mockResolvedValueOnce(respuesta({message:{items:Array.from({length:100},()=>obra),"next-cursor":"pagina-2"}})).mockResolvedValueOnce({data:null,status:503,error:"HTTP_503",headers:new Headers()});
    expect(await consultarCrossref(profesor)).toEqual({publicaciones:[],error:"HTTP_503"});
  });
  it("distingue ausencia de coincidencias y paginación incompleta",async()=>{
    http.mockResolvedValueOnce(respuesta({message:{items:[]}}));expect(await consultarCrossref(profesor)).toEqual({publicaciones:[]});
    http.mockResolvedValueOnce(respuesta({message:{items:Array.from({length:100},()=>obra),"next-cursor":"*"}}));expect((await consultarCrossref(profesor)).error).toBe("PAGINACION_INCOMPLETA");
  });
});

describe("Google Scholar mediante SerpAPI (#167)",()=>{
  it("exige perfil y clave antes de consultar",async()=>{
    expect((await consultarGoogleScholar({...profesor,scholarId:null},undefined,undefined,"ficticia")).error).toBe("FALTA_IDENTIFICADOR");
    expect((await consultarGoogleScholar(profesor,undefined,undefined,"")).error).toBe("NO_API_KEY");expect(http).not.toHaveBeenCalled();
  });
  it("pagina por perfil y siempre usa el endpoint fijo, sin seguir enlaces externos con la clave",async()=>{
    http.mockResolvedValueOnce(respuesta({articles:[{title:"Obra ficticia",authors:"Persona Ficticia",year:"2026"}],serpapi_pagination:{next:"https://otro.invalid/search?cstart=100"}})).mockResolvedValueOnce(respuesta({articles:[{title:"Otra obra ficticia",year:"2025"}]}));
    const resultado=await consultarGoogleScholar(profesor,2025,2026,"clave-ficticia");
    expect(resultado.publicaciones).toHaveLength(2);expect(resultado.publicaciones[0]).toMatchObject({fuente:"GOOGLE_SCHOLAR",profesorId:1,anio:2026});
    expect(http.mock.calls.map(c=>c[0])).toEqual(["https://serpapi.com/search.json","https://serpapi.com/search.json"]);
    expect(http.mock.calls[1][1]?.params?.start).toBe(100);
  });
  it("traduce límites del proveedor y no devuelve ni guarda su texto técnico",async()=>{
    http.mockResolvedValueOnce({data:null,status:429,error:"HTTP_429",headers:new Headers()});
    expect(await consultarGoogleScholar(profesor,undefined,undefined,"ficticia")).toEqual({publicaciones:[],error:"HTTP_429"});
    http.mockResolvedValueOnce(respuesta({error:"invalid api key clave-ficticia"}));
    expect(await consultarGoogleScholar(profesor,undefined,undefined,"ficticia")).toEqual({publicaciones:[],error:"CONSULTA_FALLIDA"});
  });
  it("reconoce un perfil vacío y detiene páginas anteriores al periodo incremental",async()=>{
    http.mockResolvedValueOnce(respuesta({articles:[]}));expect(await consultarGoogleScholar(profesor,undefined,undefined,"ficticia")).toEqual({publicaciones:[]});
    http.mockResolvedValueOnce(respuesta({articles:[{title:"Obra antigua",year:2010}],serpapi_pagination:{next:"https://serpapi.com/?start=100"}}));
    expect(await consultarGoogleScholar(profesor,2025,2026,"ficticia")).toEqual({publicaciones:[]});expect(http).toHaveBeenCalledTimes(2);
  });
});
