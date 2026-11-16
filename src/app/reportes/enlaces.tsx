import Link from "next/link";

const ENLACES = [
  { id: "vigencias", href: "/reportes", texto: "Vigencias" },
  { id: "convocatoria", href: "/reportes/convocatoria", texto: "Convocatoria anual" },
  { id: "matriz", href: "/reportes/matriz", texto: "Matriz de acreditación" },
  { id: "completo", href: "/reportes/completo", texto: "Reporte completo" },
] as const;

export function EnlacesReportes({ actual }: { actual: (typeof ENLACES)[number]["id"] }) {
  return (
    <nav aria-label="Reportes" className="mb-4 flex flex-wrap gap-4">
      {ENLACES.map((enlace) => enlace.id === actual
        ? <span key={enlace.id} className="text-sm font-medium text-texto" aria-current="page">{enlace.texto}</span>
        : <Link key={enlace.id} href={enlace.href} className="text-sm font-medium text-marca">{enlace.texto}</Link>)}
    </nav>
  );
}
