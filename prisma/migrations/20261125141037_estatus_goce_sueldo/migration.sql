-- AlterEnum
BEGIN;
CREATE TYPE "EstatusLaboral_new" AS ENUM ('ACTIVO', 'LICENCIA', 'ESTANCIA_POSDOCTORAL');
ALTER TABLE "public"."Profesor" ALTER COLUMN "estatusLaboral" DROP DEFAULT;
-- D-273: baja temporal y trasladado pasan a licencia; baja posdoctoral, a estancia.
-- El goce de sueldo se agrega después, en falso, para todas las filas.
ALTER TABLE "Profesor" ALTER COLUMN "estatusLaboral" TYPE "EstatusLaboral_new" USING (
  CASE "estatusLaboral"::text
    WHEN 'BAJA_TEMPORAL' THEN 'LICENCIA'
    WHEN 'TRASLADADO' THEN 'LICENCIA'
    WHEN 'BAJA_POSDOCTORAL' THEN 'ESTANCIA_POSDOCTORAL'
    ELSE "estatusLaboral"::text
  END::"EstatusLaboral_new"
);
ALTER TYPE "EstatusLaboral" RENAME TO "EstatusLaboral_old";
ALTER TYPE "EstatusLaboral_new" RENAME TO "EstatusLaboral";
DROP TYPE "public"."EstatusLaboral_old";
ALTER TABLE "Profesor" ALTER COLUMN "estatusLaboral" SET DEFAULT 'ACTIVO';
COMMIT;

-- AlterTable
ALTER TABLE "Profesor" ADD COLUMN     "goceDeSueldo" BOOLEAN NOT NULL DEFAULT false;
