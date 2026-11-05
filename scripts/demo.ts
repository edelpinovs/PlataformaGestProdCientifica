// Datos de demostración FICTICIOS para ver la interfaz con contenido.
//   npm run db:demo            carga los datos (primero borra los demo anteriores y vuelve a crearlos)
//   npm run db:demo:contar     solo cuenta lo que hay marcado como demo
//   npm run db:demo:limpiar    borra únicamente lo marcado como demo
//
// Nunca borra datos reales: todo borrado lleva WHERE sobre la marca de los datos demo
// (ver scripts/lib/datos-demo.ts). No usa TRUNCATE ni borrados sin condición.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  ANIO_CONVOCATORIA_DEMO,
  DEPARTAMENTOS_BASE,
  DOMINIO_DEMO,
  GRADOS_BASE,
  MARCA_TITULO,
  PREFIJO_CA,
  PREFIJO_PE,
  generarDatosDemo,
} from "./lib/datos-demo";

const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  console.error("Falta DIRECT_URL en .env.");
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const profesorDemo = { correo: { endsWith: `@${DOMINIO_DEMO}` } };

async function contar() {
  const [profesores, programas, snii, prodep, cuerpos, publicaciones, autorias] = await Promise.all([
    prisma.profesor.count({ where: profesorDemo }),
    prisma.programaEducativo.count({ where: { clave: { startsWith: PREFIJO_PE } } }),
    prisma.reconocimientoSnii.count({ where: { profesor: profesorDemo } }),
    prisma.reconocimientoProdep.count({ where: { profesor: profesorDemo } }),
    prisma.cuerpoAcademico.count({ where: { clave: { startsWith: PREFIJO_CA } } }),
    prisma.publicacion.count({ where: { titulo: { startsWith: MARCA_TITULO } } }),
    prisma.autoria.count({ where: { publicacion: { titulo: { startsWith: MARCA_TITULO } } } }),
  ]);
  return { profesores, programas, snii, prodep, cuerpos, publicaciones, autorias };
}

async function limpiar() {
  // De lo más dependiente a lo menos dependiente. Cada borrado lleva su WHERE.
  return prisma.$transaction(async (tx) => {
    const resultado: Record<string, number> = {};
    resultado.cuerpos = (await tx.cuerpoAcademico.deleteMany({ where: { clave: { startsWith: PREFIJO_CA } } })).count; // integrantes y LGAC se borran en cascada
    resultado.autorias = (
      await tx.autoria.deleteMany({
        where: { OR: [{ profesor: profesorDemo }, { publicacion: { titulo: { startsWith: MARCA_TITULO } } }] },
      })
    ).count;
    resultado.publicaciones = (await tx.publicacion.deleteMany({ where: { titulo: { startsWith: MARCA_TITULO } } })).count;
    resultado.cortes = (await tx.corteEscaneo.deleteMany({ where: { profesor: profesorDemo } })).count;
    resultado.participaciones = (await tx.participacionConvocatoria.deleteMany({ where: { profesor: profesorDemo } })).count;
    resultado.snii = (await tx.reconocimientoSnii.deleteMany({ where: { profesor: profesorDemo } })).count;
    resultado.prodep = (await tx.reconocimientoProdep.deleteMany({ where: { profesor: profesorDemo } })).count;
    resultado.convocatorias = (
      await tx.convocatoria.deleteMany({
        where: {
          programa: "SNII",
          anio: ANIO_CONVOCATORIA_DEMO,
          participaciones: { none: {} },
          cargas: { none: {} },
          reconocimientosSnii: { none: {} },
          reconocimientosProdep: { none: {} },
        },
      })
    ).count;
    // Un profesor con cuenta de acceso (Perfil) no se borra: la relación es opcional y Prisma haría SetNull.
    resultado.profesores = (await tx.profesor.deleteMany({ where: { ...profesorDemo, perfil: { is: null } } })).count;
    resultado.programas = (
      await tx.programaEducativo.deleteMany({ where: { clave: { startsWith: PREFIJO_PE }, profesores: { none: {} } } })
    ).count;
    return resultado;
  }, { timeout: 60_000 });
}

async function cargar() {
  const datos = generarDatosDemo(new Date());

  const departamentos = new Map(
    (await prisma.departamento.findMany({ where: { nomenclatura: { in: [...DEPARTAMENTOS_BASE] } } })).map((d) => [d.nomenclatura, d.id]),
  );
  const grados = new Map(
    (await prisma.gradoCientifico.findMany({ where: { nombre: { in: [...GRADOS_BASE] } } })).map((g) => [g.nombre, g.id]),
  );
  if (departamentos.size < DEPARTAMENTOS_BASE.length || grados.size < GRADOS_BASE.length) {
    throw new Error("Faltan departamentos o grados base. Ejecuta primero `npm run db:seed`.");
  }

  const anterior = await limpiar();
  console.log("Datos demo anteriores borrados:", JSON.stringify(anterior));

  const programaId = new Map<string, number>();
  for (const p of datos.programas) {
    const creado = await prisma.programaEducativo.create({
      data: { clave: p.clave, nombre: p.nombre, departamentoId: departamentos.get(p.departamento) },
    });
    programaId.set(p.clave, creado.id);
  }

  const profesorId = new Map<number, number>();
  for (const p of datos.profesores) {
    const creado = await prisma.profesor.create({
      data: {
        codigo: p.codigo,
        nombres: p.nombres,
        apellidos: p.apellidos,
        nombreNormalizado: p.nombreNormalizado,
        correo: p.correo,
        genero: p.genero,
        tipoContratacion: p.tipoContratacion,
        estatusLaboral: p.estatusLaboral,
        gradoId: p.grado ? grados.get(p.grado) : null,
        departamentoId: p.departamento ? departamentos.get(p.departamento) : null,
        cvu: p.cvu,
        orcid: p.orcid,
        scopusId: p.scopusId,
        scholarId: p.scholarId,
        programas: p.programa ? { connect: [{ id: programaId.get(p.programa)! }] } : undefined,
      },
    });
    profesorId.set(p.indice, creado.id);
  }

  const convocatoria = await prisma.convocatoria.upsert({
    where: { programa_anio: { programa: "SNII", anio: ANIO_CONVOCATORIA_DEMO } },
    update: {},
    create: { programa: "SNII", anio: ANIO_CONVOCATORIA_DEMO },
  });

  await prisma.reconocimientoSnii.createMany({
    data: datos.snii.map((s) => ({
      profesorId: profesorId.get(s.profesor)!,
      nivel: s.nivel,
      tipoParticipacion: s.tipoParticipacion,
      resultado: s.resultado,
      inicio: s.inicio,
      fin: s.fin,
      convocatoriaId: s.conConvocatoria ? convocatoria.id : null,
    })),
  });

  await prisma.reconocimientoProdep.createMany({
    data: datos.prodep.map((p) => ({
      profesorId: profesorId.get(p.profesor)!,
      tipoSolicitud: p.tipoSolicitud,
      resultado: p.resultado,
      inicio: p.inicio,
      fin: p.fin,
    })),
  });

  for (const c of datos.cuerpos) {
    await prisma.cuerpoAcademico.create({
      data: {
        clave: c.clave,
        nombre: c.nombre,
        nivel: c.nivel,
        areaProdep: c.areaProdep,
        disciplina: c.disciplina,
        departamentoId: departamentos.get(c.departamento)!,
        anioRegistro: c.anioRegistro,
        anioVencimiento: c.anioVencimiento,
        liderId: c.lider === null ? null : profesorId.get(c.lider)!,
        integrantes: { create: c.integrantes.map((i) => ({ profesorId: profesorId.get(i)! })) },
        lgacs: {
          create: c.lgacs.map((l) => ({
            nombre: l.nombre,
            descripcion: l.descripcion,
            profesores: { connect: l.profesores.map((i) => ({ id: profesorId.get(i)! })) },
          })),
        },
      },
    });
  }

  const publicacionId = new Map<number, number>();
  for (const p of datos.publicaciones) {
    const creada = await prisma.publicacion.create({
      data: {
        tipo: p.tipo,
        titulo: p.titulo,
        tituloNormalizado: p.tituloNormalizado,
        doi: p.doi,
        autoresTexto: p.autoresTexto,
        revistaEditorial: p.revistaEditorial,
        isbnIssn: p.isbnIssn,
        fechaPublicacion: p.fechaPublicacion,
        volumen: p.volumen,
        paginas: p.paginas,
        evidenciaUrl: p.evidenciaUrl,
        fuente: p.fuente,
      },
    });
    publicacionId.set(p.indice, creada.id);
  }
  await prisma.autoria.createMany({
    data: datos.autorias.map((a) => ({
      publicacionId: publicacionId.get(a.publicacion)!,
      profesorId: profesorId.get(a.profesor)!,
      estado: a.estado,
      revisadaEn: a.revisadaEn,
    })),
  });
}

async function main() {
  const modo = process.argv[2];
  if (modo === "cargar") {
    await cargar();
    console.log("Datos demo cargados:", JSON.stringify(await contar()));
  } else if (modo === "limpiar") {
    console.log("Datos demo borrados:", JSON.stringify(await limpiar()));
  } else if (modo === "contar") {
    console.log("Datos demo existentes:", JSON.stringify(await contar()));
  } else {
    console.error("Uso: tsx scripts/demo.ts cargar | limpiar | contar");
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
