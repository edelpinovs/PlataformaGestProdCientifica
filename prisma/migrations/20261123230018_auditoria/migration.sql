-- CreateTable
CREATE TABLE "Auditoria" (
    "id" SERIAL NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" UUID,
    "actorCorreo" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Auditoria_creadoEn_idx" ON "Auditoria"("creadoEn");

-- CreateIndex
CREATE INDEX "Auditoria_modulo_accion_idx" ON "Auditoria"("modulo", "accion");

-- RLS para tablas nuevas
ALTER TABLE "Auditoria" ENABLE ROW LEVEL SECURITY;
