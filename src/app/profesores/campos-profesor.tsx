import { Aviso, claseCampo, claseEtiqueta } from "@/components/ui";
import { ETIQUETA_CONTRATACION, ETIQUETA_ESTATUS } from "@/modules/profesores/profesores";

type Props = {
  grados: { id: number; nombre: string; nomenclatura: string }[];
  departamentos: { id: number; nombre: string }[];
  /** Valor conservado de un campo tras un error; cadena vacía si no hay. */
  valor: (nombre: string) => string;
  /** Campo con error, para marcarlo con `aria-invalid`. */
  campo?: string;
  /** Mensaje que se muestra junto al género (solo el formulario de página lo usa). */
  errorGenero?: string;
};

/**
 * Campos del alta de un profesor (RF-004). Los comparten el formulario de página
 * (`/profesores/nuevo`) y el modal del listado (D-214); cada uno aporta su `<form>`.
 */
export function CamposProfesor({ grados, departamentos, valor, campo, errorGenero }: Props) {
  const err = (nombre: string) => campo === nombre;

  return (
    <>
      {/* ── Datos personales ───────────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold text-texto-2">Datos personales</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            <span>Nombres <span aria-hidden className="text-peligro">*</span></span>
            <input
              id="nombres"
              name="nombres"
              required
              maxLength={150}
              placeholder="Ej. María José"
              defaultValue={valor("nombres")}
              aria-invalid={err("nombres")}
              className={claseCampo(err("nombres"))}
            />
          </label>

          <label className={claseEtiqueta}>
            <span>Apellidos <span aria-hidden className="text-peligro">*</span></span>
            <input
              id="apellidos"
              name="apellidos"
              required
              maxLength={150}
              placeholder="Ej. García López"
              defaultValue={valor("apellidos")}
              aria-invalid={err("apellidos")}
              className={claseCampo(err("apellidos"))}
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <span className={claseEtiqueta}>
            <span>Género <span aria-hidden className="text-peligro">*</span></span>
          </span>
          <div className="flex gap-4">
            {(
              [
                { valor: "M", texto: "Masculino" },
                { valor: "F", texto: "Femenino" },
              ] as const
            ).map((opcion) => (
              <label key={opcion.valor} className="flex cursor-pointer items-center gap-2 text-sm text-texto-2">
                <input
                  type="radio"
                  name="genero"
                  value={opcion.valor}
                  defaultChecked={valor("genero") === opcion.valor}
                  required
                  className="accent-[var(--marca)]"
                />
                {opcion.texto}
              </label>
            ))}
          </div>
          {errorGenero && <Aviso tipo="error">{errorGenero}</Aviso>}
        </div>
      </fieldset>

      {/* ── Datos institucionales ──────────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold text-texto-2">Datos institucionales</legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            <span>Código CUValles <span aria-hidden className="text-peligro">*</span></span>
            <input
              id="codigo"
              name="codigo"
              required
              maxLength={20}
              placeholder="Ej. GALO1234"
              defaultValue={valor("codigo")}
              aria-invalid={err("codigo")}
              className={claseCampo(err("codigo"))}
            />
          </label>

          <label className={claseEtiqueta}>
            <span>Correo institucional <span aria-hidden className="text-peligro">*</span></span>
            <input
              id="correo"
              name="correo"
              type="email"
              required
              maxLength={200}
              placeholder="correo@cuvalles.udg.mx"
              defaultValue={valor("correo")}
              aria-invalid={err("correo")}
              className={claseCampo(err("correo"))}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            <span>Tipo de contratación <span aria-hidden className="text-peligro">*</span></span>
            <select
              id="tipoContratacion"
              name="tipoContratacion"
              required
              defaultValue={valor("tipoContratacion")}
              aria-invalid={err("tipoContratacion")}
              className={claseCampo(err("tipoContratacion"))}
            >
              <option value="" disabled>
                — Selecciona —
              </option>
              {Object.entries(ETIQUETA_CONTRATACION).map(([clave, texto]) => (
                <option key={clave} value={clave}>{texto}</option>
              ))}
            </select>
          </label>

          <label className={claseEtiqueta}>
            <span>Estatus laboral <span aria-hidden className="text-peligro">*</span></span>
            <select
              id="estatusLaboral"
              name="estatusLaboral"
              required
              defaultValue={valor("estatusLaboral")}
              aria-invalid={err("estatusLaboral")}
              className={claseCampo(err("estatusLaboral"))}
            >
              <option value="" disabled>
                — Selecciona —
              </option>
              {Object.entries(ETIQUETA_ESTATUS).map(([clave, texto]) => (
                <option key={clave} value={clave}>{texto}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            Departamento
            <select
              id="departamentoId"
              name="departamentoId"
              defaultValue={valor("departamentoId")}
              aria-invalid={err("departamentoId")}
              className={claseCampo(err("departamentoId"))}
            >
              <option value="">— Sin asignar —</option>
              {departamentos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className={claseEtiqueta}>
            Grado científico
            <select
              id="gradoId"
              name="gradoId"
              defaultValue={valor("gradoId")}
              aria-invalid={err("gradoId")}
              className={claseCampo(err("gradoId"))}
            >
              <option value="">— Sin especificar —</option>
              {grados.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre} ({g.nomenclatura})
                </option>
              ))}
            </select>
          </label>
        </div>
      </fieldset>

      {/* ── Identificadores académicos ─────────────────────── */}
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-sm font-semibold text-texto-2">
          Identificadores académicos{" "}
          <span className="font-normal text-texto-3">(opcionales)</span>
        </legend>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            CVU (CONACYT)
            <input
              id="cvu"
              name="cvu"
              maxLength={20}
              placeholder="Ej. 123456"
              defaultValue={valor("cvu")}
              aria-invalid={err("cvu")}
              className={claseCampo(err("cvu"))}
            />
          </label>

          <label className={claseEtiqueta}>
            ORCID
            <input
              id="orcid"
              name="orcid"
              maxLength={20}
              placeholder="0000-0000-0000-0000"
              defaultValue={valor("orcid")}
              aria-invalid={err("orcid")}
              className={claseCampo(err("orcid"))}
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className={claseEtiqueta}>
            Scholar ID
            <input
              id="scholarId"
              name="scholarId"
              maxLength={50}
              placeholder="5 a 50 caracteres"
              defaultValue={valor("scholarId")}
              aria-invalid={err("scholarId")}
              className={claseCampo(err("scholarId"))}
            />
          </label>

          <label className={claseEtiqueta}>
            Scopus ID
            <input
              id="scopusId"
              name="scopusId"
              maxLength={20}
              placeholder="4 a 20 dígitos"
              defaultValue={valor("scopusId")}
              aria-invalid={err("scopusId")}
              className={claseCampo(err("scopusId"))}
            />
          </label>
        </div>
      </fieldset>
    </>
  );
}
