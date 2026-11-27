-- CreateTable
CREATE TABLE "InvitacionPendiente" (
    "id" SERIAL NOT NULL,
    "correo" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'DOCENTE',
    "profesorId" INTEGER,
    "creadaPor" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitacionPendiente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvitacionPendiente_correo_key" ON "InvitacionPendiente"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "InvitacionPendiente_profesorId_key" ON "InvitacionPendiente"("profesorId");

-- AddForeignKey
ALTER TABLE "InvitacionPendiente" ADD CONSTRAINT "InvitacionPendiente_profesorId_fkey" FOREIGN KEY ("profesorId") REFERENCES "Profesor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS para tablas nuevas
ALTER TABLE "InvitacionPendiente" ENABLE ROW LEVEL SECURITY;
