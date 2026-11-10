-- CreateTable
CREATE TABLE "RenglonResultado" (
    "id" SERIAL NOT NULL,
    "cargaId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "cvu" TEXT,
    "codigo" TEXT,
    "apellidoPaterno" TEXT,
    "apellidoMaterno" TEXT,
    "nombres" TEXT NOT NULL,
    "nivelTexto" TEXT,
    "nivel" "NivelSnii",
    "vigenciaInicio" DATE,
    "vigenciaFin" DATE,

    CONSTRAINT "RenglonResultado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RenglonResultado_cargaId_cvu_idx" ON "RenglonResultado"("cargaId", "cvu");

-- CreateIndex
CREATE UNIQUE INDEX "RenglonResultado_cargaId_numero_key" ON "RenglonResultado"("cargaId", "numero");

-- AddForeignKey
ALTER TABLE "RenglonResultado" ADD CONSTRAINT "RenglonResultado_cargaId_fkey" FOREIGN KEY ("cargaId") REFERENCES "CargaResultados"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS para tablas nuevas
ALTER TABLE "RenglonResultado" ENABLE ROW LEVEL SECURITY;
