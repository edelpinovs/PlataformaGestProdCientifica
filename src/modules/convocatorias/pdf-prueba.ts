// Solo para pruebas: escribe un PDF mínimo (Helvetica, texto en posiciones fijas) para probar
// el lector de PDF sin agregar otra dependencia. No lo usa la aplicación.

export type TextoDePrueba = { x: number; y: number; texto: string; tamano?: number };

const escapar = (texto: string) => texto.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

export function crearPdfDePrueba(paginas: TextoDePrueba[][]): Uint8Array {
  const objetos: string[] = [];
  const fuente = 3;
  const primeraPagina = 4;
  const kids = paginas.map((_, i) => `${primeraPagina + i * 2} 0 R`).join(" ");

  objetos[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objetos[2] = `<< /Type /Pages /Kids [${kids}] /Count ${paginas.length} >>`;
  objetos[fuente] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  paginas.forEach((textos, i) => {
    const pagina = primeraPagina + i * 2;
    const contenido = textos
      .map((t) => `BT /F1 ${t.tamano ?? 8} Tf ${t.x} ${t.y} Td (${escapar(t.texto)}) Tj ET`)
      .join("\n");
    objetos[pagina] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fuente} 0 R >> >> /Contents ${pagina + 1} 0 R >>`;
    objetos[pagina + 1] = `<< /Length ${Buffer.byteLength(contenido, "latin1")} >>\nstream\n${contenido}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const posiciones: number[] = [];
  for (let n = 1; n < objetos.length; n++) {
    posiciones[n] = Buffer.byteLength(pdf, "latin1");
    pdf += `${n} 0 obj\n${objetos[n]}\nendobj\n`;
  }
  const inicioXref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objetos.length}\n0000000000 65535 f \n`;
  for (let n = 1; n < objetos.length; n++) pdf += `${String(posiciones[n]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objetos.length} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(pdf, "latin1"));
}
