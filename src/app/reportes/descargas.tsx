import { claseBotonSecundario } from "@/components/ui";

export function Descargas({ excel, pdf }: { excel: string; pdf: string }) {
  return (
    <div className="flex flex-wrap gap-4">
      <a className={claseBotonSecundario} href={excel}>Descargar Excel</a>
      <a className={claseBotonSecundario} href={pdf}>Descargar PDF</a>
    </div>
  );
}
