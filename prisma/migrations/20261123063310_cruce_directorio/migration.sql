-- CreateEnum
CREATE TYPE "OrigenParticipacion" AS ENUM ('MANUAL', 'LISTADO');

-- CreateEnum
CREATE TYPE "CriterioCruce" AS ENUM ('CVU', 'CODIGO', 'NOMBRE', 'AMBIGUO', 'SIN_COINCIDENCIA');

-- AlterTable
ALTER TABLE "ParticipacionConvocatoria" ADD COLUMN     "origen" "OrigenParticipacion" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "RenglonResultado" ADD COLUMN     "criterio" "CriterioCruce",
ADD COLUMN     "profesorId" INTEGER;

-- CreateIndex
CREATE INDEX "RenglonResultado_profesorId_idx" ON "RenglonResultado"("profesorId");

-- AddForeignKey
ALTER TABLE "RenglonResultado" ADD CONSTRAINT "RenglonResultado_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
