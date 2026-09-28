-- Similitud de títulos para la deduplicación (RF-021, RNF-004).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'COORDINADOR', 'DOCENTE');

-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('M', 'F');

-- CreateEnum
CREATE TYPE "TipoContratacion" AS ENUM ('TIEMPO_COMPLETO', 'ASIGNATURA');

-- CreateEnum
CREATE TYPE "EstatusLaboral" AS ENUM ('ACTIVO', 'LICENCIA', 'BAJA_TEMPORAL', 'BAJA_POSDOCTORAL', 'TRASLADADO');

-- CreateEnum
CREATE TYPE "NivelSnii" AS ENUM ('CANDIDATO', 'NIVEL_1', 'NIVEL_2', 'NIVEL_3', 'EMERITO', 'NO_APROBADO');

-- CreateEnum
CREATE TYPE "TipoParticipacionSnii" AS ENUM ('NUEVO_INGRESO', 'RENOVACION', 'REINGRESO_NO_VIGENTE');

-- CreateEnum
CREATE TYPE "TipoSolicitudProdep" AS ENUM ('PRIMER_RECONOCIMIENTO', 'RENOVACION');

-- CreateEnum
CREATE TYPE "ResultadoDictamen" AS ENUM ('APROBADO', 'NO_APROBADO', 'EN_RECONSIDERACION');

-- CreateEnum
CREATE TYPE "NivelConsolidacion" AS ENUM ('EN_FORMACION', 'EN_CONSOLIDACION', 'CONSOLIDADO');

-- CreateEnum
CREATE TYPE "ProgramaConvocatoria" AS ENUM ('SNII', 'PRODEP');

-- CreateEnum
CREATE TYPE "EstadoCarga" AS ENUM ('PROCESANDO', 'EN_REVISION', 'CONFIRMADA', 'FALLIDA');

-- CreateEnum
CREATE TYPE "TipoPublicacion" AS ENUM ('ARTICULO', 'LIBRO', 'CAPITULO', 'MEMORIA_CONGRESO', 'REGISTRO_SOFTWARE', 'PATENTE', 'OTRO');

-- CreateEnum
CREATE TYPE "FuentePublicacion" AS ENUM ('ORCID', 'SCOPUS', 'OPENALEX', 'GOOGLE_SCHOLAR', 'MANUAL');

-- CreateEnum
CREATE TYPE "EstadoAutoria" AS ENUM ('PENDIENTE', 'VALIDADA', 'RECHAZADA');

-- CreateEnum
CREATE TYPE "EstadoJob" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADO', 'FALLIDO');

-- CreateTable
CREATE TABLE "Perfil" (
    "id" UUID NOT NULL,
    "correo" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'DOCENTE',
    "profesorId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradoCientifico" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nomenclatura" TEXT NOT NULL,

    CONSTRAINT "GradoCientifico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Division" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,

    CONSTRAINT "Division_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departamento" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nomenclatura" TEXT NOT NULL,
    "divisionId" INTEGER NOT NULL,

    CONSTRAINT "Departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramaEducativo" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "departamentoId" INTEGER,

    CONSTRAINT "ProgramaEducativo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profesor" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "nombreNormalizado" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "genero" "Genero" NOT NULL,
    "tipoContratacion" "TipoContratacion" NOT NULL,
    "estatusLaboral" "EstatusLaboral" NOT NULL DEFAULT 'ACTIVO',
    "gradoId" INTEGER,
    "departamentoId" INTEGER,
    "cvu" TEXT,
    "orcid" TEXT,
    "scopusId" TEXT,
    "scholarId" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profesor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconocimientoSnii" (
    "id" SERIAL NOT NULL,
    "profesorId" INTEGER NOT NULL,
    "nivel" "NivelSnii" NOT NULL,
    "tipoParticipacion" "TipoParticipacionSnii" NOT NULL,
    "resultado" "ResultadoDictamen" NOT NULL,
    "inicio" DATE NOT NULL,
    "fin" DATE NOT NULL,
    "convocatoriaId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconocimientoSnii_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReconocimientoProdep" (
    "id" SERIAL NOT NULL,
    "profesorId" INTEGER NOT NULL,
    "tipoSolicitud" "TipoSolicitudProdep" NOT NULL,
    "resultado" "ResultadoDictamen" NOT NULL,
    "inicio" DATE NOT NULL,
    "fin" DATE NOT NULL,
    "convocatoriaId" INTEGER,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReconocimientoProdep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuerpoAcademico" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivel" "NivelConsolidacion" NOT NULL,
    "areaProdep" TEXT NOT NULL,
    "disciplina" TEXT NOT NULL,
    "departamentoId" INTEGER NOT NULL,
    "anioRegistro" INTEGER NOT NULL,
    "anioVencimiento" INTEGER NOT NULL,
    "liderId" INTEGER,

    CONSTRAINT "CuerpoAcademico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegranteCa" (
    "cuerpoId" INTEGER NOT NULL,
    "profesorId" INTEGER NOT NULL,

    CONSTRAINT "IntegranteCa_pkey" PRIMARY KEY ("cuerpoId","profesorId")
);

-- CreateTable
CREATE TABLE "Lgac" (
    "id" SERIAL NOT NULL,
    "cuerpoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "Lgac_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Convocatoria" (
    "id" SERIAL NOT NULL,
    "programa" "ProgramaConvocatoria" NOT NULL,
    "anio" INTEGER NOT NULL,

    CONSTRAINT "Convocatoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParticipacionConvocatoria" (
    "id" SERIAL NOT NULL,
    "convocatoriaId" INTEGER NOT NULL,
    "profesorId" INTEGER NOT NULL,
    "resultado" "ResultadoDictamen",

    CONSTRAINT "ParticipacionConvocatoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargaResultados" (
    "id" SERIAL NOT NULL,
    "convocatoriaId" INTEGER NOT NULL,
    "archivoRuta" TEXT NOT NULL,
    "estado" "EstadoCarga" NOT NULL DEFAULT 'PROCESANDO',
    "balance" JSONB,
    "cargadaPor" UUID NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CargaResultados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publicacion" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoPublicacion" NOT NULL,
    "titulo" TEXT NOT NULL,
    "tituloNormalizado" TEXT NOT NULL,
    "doi" TEXT,
    "autoresTexto" TEXT NOT NULL,
    "revistaEditorial" TEXT,
    "isbnIssn" TEXT,
    "fechaPublicacion" DATE,
    "volumen" TEXT,
    "paginas" TEXT,
    "evidenciaUrl" TEXT,
    "fuente" "FuentePublicacion" NOT NULL,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Publicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Autoria" (
    "publicacionId" INTEGER NOT NULL,
    "profesorId" INTEGER NOT NULL,
    "estado" "EstadoAutoria" NOT NULL DEFAULT 'PENDIENTE',
    "revisadaEn" TIMESTAMP(3),

    CONSTRAINT "Autoria_pkey" PRIMARY KEY ("publicacionId","profesorId")
);

-- CreateTable
CREATE TABLE "CorteEscaneo" (
    "profesorId" INTEGER NOT NULL,
    "fuente" "FuentePublicacion" NOT NULL,
    "ultimaFecha" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorteEscaneo_pkey" PRIMARY KEY ("profesorId","fuente")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "estado" "EstadoJob" NOT NULL DEFAULT 'PENDIENTE',
    "avance" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "datos" JSONB,
    "error" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProfesorToProgramaEducativo" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ProfesorToProgramaEducativo_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_LgacToProfesor" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_LgacToProfesor_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Perfil_correo_key" ON "Perfil"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Perfil_profesorId_key" ON "Perfil"("profesorId");

-- CreateIndex
CREATE UNIQUE INDEX "GradoCientifico_nombre_key" ON "GradoCientifico"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "GradoCientifico_nomenclatura_key" ON "GradoCientifico"("nomenclatura");

-- CreateIndex
CREATE UNIQUE INDEX "Division_clave_key" ON "Division"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_nomenclatura_key" ON "Departamento"("nomenclatura");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramaEducativo_clave_key" ON "ProgramaEducativo"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Profesor_codigo_key" ON "Profesor"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Profesor_correo_key" ON "Profesor"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "Profesor_cvu_key" ON "Profesor"("cvu");

-- CreateIndex
CREATE UNIQUE INDEX "Profesor_orcid_key" ON "Profesor"("orcid");

-- CreateIndex
CREATE UNIQUE INDEX "Profesor_scopusId_key" ON "Profesor"("scopusId");

-- CreateIndex
CREATE UNIQUE INDEX "Profesor_scholarId_key" ON "Profesor"("scholarId");

-- CreateIndex
CREATE INDEX "Profesor_nombreNormalizado_idx" ON "Profesor"("nombreNormalizado");

-- CreateIndex
CREATE INDEX "ReconocimientoSnii_fin_idx" ON "ReconocimientoSnii"("fin");

-- CreateIndex
CREATE INDEX "ReconocimientoProdep_fin_idx" ON "ReconocimientoProdep"("fin");

-- CreateIndex
CREATE UNIQUE INDEX "CuerpoAcademico_clave_key" ON "CuerpoAcademico"("clave");

-- CreateIndex
CREATE UNIQUE INDEX "Convocatoria_programa_anio_key" ON "Convocatoria"("programa", "anio");

-- CreateIndex
CREATE UNIQUE INDEX "ParticipacionConvocatoria_convocatoriaId_profesorId_key" ON "ParticipacionConvocatoria"("convocatoriaId", "profesorId");

-- CreateIndex
CREATE UNIQUE INDEX "Publicacion_doi_key" ON "Publicacion"("doi");

-- CreateIndex
CREATE INDEX "Publicacion_tituloNormalizado_idx" ON "Publicacion" USING GIN ("tituloNormalizado" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Autoria_profesorId_estado_idx" ON "Autoria"("profesorId", "estado");

-- CreateIndex
CREATE INDEX "Job_estado_tipo_idx" ON "Job"("estado", "tipo");

-- CreateIndex
CREATE INDEX "_ProfesorToProgramaEducativo_B_index" ON "_ProfesorToProgramaEducativo"("B");

-- CreateIndex
CREATE INDEX "_LgacToProfesor_B_index" ON "_LgacToProfesor"("B");

-- AddForeignKey
ALTER TABLE "Perfil" ADD CONSTRAINT "Perfil_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departamento" ADD CONSTRAINT "Departamento_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "Division"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgramaEducativo" ADD CONSTRAINT "ProgramaEducativo_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profesor" ADD CONSTRAINT "Profesor_gradoId_fkey" FOREIGN KEY ("gradoId") REFERENCES "GradoCientifico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profesor" ADD CONSTRAINT "Profesor_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconocimientoSnii" ADD CONSTRAINT "ReconocimientoSnii_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconocimientoSnii" ADD CONSTRAINT "ReconocimientoSnii_convocatoriaId_fkey" FOREIGN KEY ("convocatoriaId") REFERENCES "Convocatoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconocimientoProdep" ADD CONSTRAINT "ReconocimientoProdep_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconocimientoProdep" ADD CONSTRAINT "ReconocimientoProdep_convocatoriaId_fkey" FOREIGN KEY ("convocatoriaId") REFERENCES "Convocatoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuerpoAcademico" ADD CONSTRAINT "CuerpoAcademico_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CuerpoAcademico" ADD CONSTRAINT "CuerpoAcademico_liderId_fkey" FOREIGN KEY ("liderId") REFERENCES "Profesor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegranteCa" ADD CONSTRAINT "IntegranteCa_cuerpoId_fkey" FOREIGN KEY ("cuerpoId") REFERENCES "CuerpoAcademico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegranteCa" ADD CONSTRAINT "IntegranteCa_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lgac" ADD CONSTRAINT "Lgac_cuerpoId_fkey" FOREIGN KEY ("cuerpoId") REFERENCES "CuerpoAcademico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipacionConvocatoria" ADD CONSTRAINT "ParticipacionConvocatoria_convocatoriaId_fkey" FOREIGN KEY ("convocatoriaId") REFERENCES "Convocatoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParticipacionConvocatoria" ADD CONSTRAINT "ParticipacionConvocatoria_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CargaResultados" ADD CONSTRAINT "CargaResultados_convocatoriaId_fkey" FOREIGN KEY ("convocatoriaId") REFERENCES "Convocatoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Autoria" ADD CONSTRAINT "Autoria_publicacionId_fkey" FOREIGN KEY ("publicacionId") REFERENCES "Publicacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Autoria" ADD CONSTRAINT "Autoria_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorteEscaneo" ADD CONSTRAINT "CorteEscaneo_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfesorToProgramaEducativo" ADD CONSTRAINT "_ProfesorToProgramaEducativo_A_fkey" FOREIGN KEY ("A") REFERENCES "Profesor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfesorToProgramaEducativo" ADD CONSTRAINT "_ProfesorToProgramaEducativo_B_fkey" FOREIGN KEY ("B") REFERENCES "ProgramaEducativo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LgacToProfesor" ADD CONSTRAINT "_LgacToProfesor_A_fkey" FOREIGN KEY ("A") REFERENCES "Lgac"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_LgacToProfesor" ADD CONSTRAINT "_LgacToProfesor_B_fkey" FOREIGN KEY ("B") REFERENCES "Profesor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
