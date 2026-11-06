-- CreateTable
CREATE TABLE "ConfiguracionScopus" (
    "id" TEXT NOT NULL,
    "claveCifrada" TEXT NOT NULL,
    "actualizadaEn" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionScopus_pkey" PRIMARY KEY ("id")
);

-- RLS para tablas nuevas
ALTER TABLE "ConfiguracionScopus" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "ConfiguracionScopus" FROM anon, authenticated;
