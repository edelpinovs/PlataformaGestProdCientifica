export type PeriodoVigencia = { id?: number; inicio: Date; fin: Date };

export function hayTraslape(
  existentes: PeriodoVigencia[],
  nuevo: PeriodoVigencia,
  idPropio?: number,
): PeriodoVigencia | null {
  return existentes.find(
    (periodo) => (idPropio === undefined || periodo.id !== idPropio)
      && periodo.inicio <= nuevo.fin
      && nuevo.inicio <= periodo.fin,
  ) ?? null;
}