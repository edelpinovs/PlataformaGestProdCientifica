-- CreateTable
CREATE TABLE "AccesoModulo" (
    "id" SERIAL NOT NULL,
    "perfilId" UUID NOT NULL,
    "modulo" TEXT NOT NULL,
    "conteo" INTEGER NOT NULL DEFAULT 1,
    "ultimoAcceso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccesoModulo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccesoModulo_perfilId_modulo_key" ON "AccesoModulo"("perfilId", "modulo");

-- AddForeignKey
ALTER TABLE "AccesoModulo" ADD CONSTRAINT "AccesoModulo_perfilId_fkey" FOREIGN KEY ("perfilId") REFERENCES "Perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS para tablas nuevas
ALTER TABLE "AccesoModulo" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "AccesoModulo" FROM anon, authenticated;
