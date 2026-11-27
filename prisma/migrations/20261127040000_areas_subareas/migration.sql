-- CreateTable
CREATE TABLE "Area" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subarea" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "areaId" INTEGER NOT NULL,

    CONSTRAINT "Subarea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Area_nombre_key" ON "Area"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Subarea_areaId_nombre_key" ON "Subarea"("areaId", "nombre");

-- AddForeignKey
ALTER TABLE "Subarea" ADD CONSTRAINT "Subarea_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS para tablas nuevas
ALTER TABLE "Area" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subarea" ENABLE ROW LEVEL SECURITY;
