// Identidad visible de la plataforma (D-217): SIGeC, Sistema Integral de Gestión Científica.
// Solo cambia lo que se ve; el repositorio, las tablas y los identificadores internos siguen
// con su nombre. Los iconos son decorativos: el nombre accesible del enlace es el texto.
//
// El icono tiene una variante por tema (claro: fondo oscuro; oscuro: fondo blanco). Se elige con
// CSS (`.marca-claro` y `.marca-oscuro` en globals.css), que sigue la elección de la persona
// (`data-tema`) y no la del sistema operativo.

export const NOMBRE_MARCA = "SIGeC";
export const DESCRIPCION_MARCA = "Sistema Integral de Gestión Científica";

export function MarcaSigec({ grande = false }: { grande?: boolean }) {
  const lado = grande ? "h-12 w-12" : "h-10 w-10";
  const medida = grande ? 48 : 40;
  /* eslint-disable @next/next/no-img-element -- SVG de pocos bytes: next/image no los optimiza */
  return (
    <>
      <img src="/marca/sigec-icono.svg" alt="" width={medida} height={medida} className={`marca-claro shrink-0 ${lado}`} />
      <img src="/marca/sigec-icono-blanco.svg" alt="" width={medida} height={medida} className={`marca-oscuro shrink-0 ${lado}`} />
      <span className="min-w-0">
        <span className={`block font-semibold leading-tight ${grande ? "text-base" : "text-sm"}`}>{NOMBRE_MARCA}</span>
        <span className="block text-xs leading-snug text-texto-3">{DESCRIPCION_MARCA}</span>
      </span>
    </>
  );
  /* eslint-enable @next/next/no-img-element */
}
