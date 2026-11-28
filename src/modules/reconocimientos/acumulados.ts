const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;
const DIAS_POR_ANIO = 365.2425;

export type PeriodoReconocimientoAcumulado = {
  inicio: Date;
  fin: Date;
  resultado: "APROBADO" | "NO_APROBADO" | "EN_RECONSIDERACION";
  esRenovacion: boolean;
};

export type AcumuladoPrograma = {
  aniosAcumulados: number;
  renovaciones: number;
};

export type AcumuladosProfesor = {
  snii: AcumuladoPrograma;
  prodep: AcumuladoPrograma;
};

type Intervalo = { inicio: number; fin: number };

function diaUtc(fecha: Date): number {
  const normalizada = new Date(fecha.getTime());
  normalizada.setUTCHours(0, 0, 0, 0);
  return Math.floor(normalizada.getTime() / MILISEGUNDOS_POR_DIA);
}

function calcularPrograma(periodos: readonly PeriodoReconocimientoAcumulado[]): AcumuladoPrograma {
  const aprobados = periodos.filter((periodo) => periodo.resultado === "APROBADO");
  const intervalos = aprobados
    .map((periodo) => ({ inicio: diaUtc(periodo.inicio), fin: diaUtc(periodo.fin) }))
    .filter((intervalo) => Number.isFinite(intervalo.inicio)
      && Number.isFinite(intervalo.fin)
      && intervalo.inicio <= intervalo.fin)
    .sort((a, b) => a.inicio - b.inicio || a.fin - b.fin);

  const unidos: Intervalo[] = [];
  for (const intervalo of intervalos) {
    const anterior = unidos[unidos.length - 1];
    if (!anterior || intervalo.inicio > anterior.fin + 1) {
      unidos.push({ ...intervalo });
    } else {
      anterior.fin = Math.max(anterior.fin, intervalo.fin);
    }
  }

  const diasUnicos = unidos.reduce((total, intervalo) => total + intervalo.fin - intervalo.inicio + 1, 0);
  return {
    aniosAcumulados: Math.round((diasUnicos / DIAS_POR_ANIO) * 100) / 100,
    renovaciones: aprobados.filter((periodo) => periodo.esRenovacion).length,
  };
}

export function calcularAcumuladosProfesor(
  snii: readonly PeriodoReconocimientoAcumulado[],
  prodep: readonly PeriodoReconocimientoAcumulado[],
): AcumuladosProfesor {
  return {
    snii: calcularPrograma(snii),
    prodep: calcularPrograma(prodep),
  };
}
