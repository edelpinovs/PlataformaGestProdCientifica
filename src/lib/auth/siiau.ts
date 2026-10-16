// Login con SIIAU, misma idea que SIGI-LEIP (código UDG y, si la red falla, copia local).
// Inactivo hasta el despliegue en la red UDG: las llamadas fetch de abajo están comentadas
// y `iniciarSesion` no invoca este módulo. El login vigente sigue siendo correo + Supabase.

export type EstadoTipoUsuario = "reconocido" | "no-udg";
export type EstadoValidacion = "aceptada" | "rechazada" | "inesperada";
export type DecisionConexion = "usar-copia-local" | "sin-copia";

// siiau-tipo-usuario: 401 o "Codigo incorrecto" significa que no es un código UDG.
// Cualquier otra respuesta se intenta validar (igual que el backend híbrido de LEIP).
export function clasificarTipoUsuario(data: unknown): EstadoTipoUsuario {
  if (!data || typeof data !== "object") return "reconocido";
  const cuerpo = data as { respuesta?: unknown; error?: unknown };
  if (cuerpo.respuesta === "401 Unauthorized" || cuerpo.error === "Codigo incorrecto") return "no-udg";
  return "reconocido";
}

// siiau-validate: `respuesta: false` son credenciales malas. Con `nombre`, el acceso es válido.
export function clasificarValidacion(data: unknown): EstadoValidacion {
  if (!data || typeof data !== "object") return "inesperada";
  const cuerpo = data as { respuesta?: unknown; nombre?: unknown };
  if (cuerpo.respuesta === false) return "rechazada";
  if (typeof cuerpo.nombre === "string" && cuerpo.nombre.length > 0) return "aceptada";
  return "inesperada";
}

// 2) SIIAU caído y ya hay copia → entrar con esa copia.
// 3) Primera vez y SIIAU caído → no entra.
export function decisionSiConexionFalla(hayCopiaLocal: boolean): DecisionConexion {
  return hayCopiaLocal ? "usar-copia-local" : "sin-copia";
}

// Flujo completo, sin ejecutar. Al activarlo en la red UDG se descomenta este bloque
// y el de `iniciarSesion`, y se leen las URLs de `.env` (hoy solo están comentadas en `.env.example`).
//
// const URL_TIPO_USUARIO = "http://148.202.89.11/d_alum/api/siiau-tipo-usuario";
// const URL_VALIDATE = "http://148.202.89.11/d_alum/api/siiau-validate";
//
// async function pedirSiiau(url: string, campos: Record<string, string>): Promise<unknown> {
//   const respuesta = await fetch(url, {
//     method: "POST",
//     headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     body: new URLSearchParams(campos),
//     signal: AbortSignal.timeout(5000),
//   });
//   return respuesta.json();
// }
//
// Hay copia local si existe un Perfil ligado al Profesor con ese `codigo`,
// o un usuario de Supabase Auth creado en un login SIIAU anterior (user_metadata.codigo).
// El correo de la copia es Profesor.correo cuando el código ya está en el directorio.
// Supabase Auth exige correo: sin profesor no se inventa uno; hay que acordarlo al activar.
//
// export async function entrarConSiiau(codigo: string, contrasena: string) {
//   const hayCopiaLocal = await existeCopiaLocal(codigo);
//
//   let tipo: unknown;
//   try {
//     tipo = await pedirSiiau(URL_TIPO_USUARIO, { codigo });
//   } catch {
//     return decisionSiConexionFalla(hayCopiaLocal) === "usar-copia-local"
//       ? entrarConCopiaLocal(codigo, contrasena)
//       : { estado: "sin-conexion-sin-copia" as const };
//   }
//
//   if (clasificarTipoUsuario(tipo) === "no-udg") return { estado: "no-udg" as const };
//
//   let validacion: unknown;
//   try {
//     validacion = await pedirSiiau(URL_VALIDATE, { codigo, pass: contrasena });
//   } catch {
//     return decisionSiConexionFalla(hayCopiaLocal) === "usar-copia-local"
//       ? entrarConCopiaLocal(codigo, contrasena)
//       : { estado: "sin-conexion-sin-copia" as const };
//   }
//
//   const resultado = clasificarValidacion(validacion);
//   if (resultado === "rechazada") return { estado: "credenciales-invalidas" as const };
//   if (resultado !== "aceptada") return { estado: "respuesta-inesperada" as const };
//
//   // 1) Primer login SIIAU correcto: copia en Supabase Auth + Perfil.
//   //    Si Profesor.codigo coincide, el Perfil queda ligado (profesorId) y usa su correo.
//   //    Si el Perfil ya existía, no se le cambia el rol; solo se actualiza la contraseña de la copia
//   //    para que el siguiente fallo de red pueda usar signInWithPassword con esa misma clave.
//   // await copiarEnSupabase({ codigo, contrasena, nombre: validacion.nombre });
//   // return { estado: "copiado" as const, correo };
// }
//
// async function entrarConCopiaLocal(codigo: string, contrasena: string) {
//   const copia = await prisma.profesor.findUnique({ where: { codigo }, include: { perfil: true } });
//   const correo = copia?.perfil?.correo;
//   if (!correo) return { estado: "sin-conexion-sin-copia" as const };
//   return { estado: "usar-copia-local" as const, correo, contrasena };
// }
//
// async function existeCopiaLocal(codigo: string) {
//   const profesor = await prisma.profesor.findUnique({ where: { codigo }, include: { perfil: true } });
//   return Boolean(profesor?.perfil);
// }
//
// async function copiarEnSupabase(datos: { codigo: string; contrasena: string; nombre: string }) {
//   // Requiere SUPABASE_SECRET_KEY en el servidor (hoy solo la usa `npm run crear-admin`, no la app).
//   const profesor = await prisma.profesor.findUnique({ where: { codigo: datos.codigo } });
//   const correo = profesor?.correo;
//   if (!correo) throw new Error("Sin correo institucional no hay copia en Auth.");
//   const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
//     auth: { persistSession: false, autoRefreshToken: false },
//   });
//   const creado = await admin.auth.admin.createUser({
//     email: correo,
//     password: datos.contrasena,
//     email_confirm: true,
//     user_metadata: { codigo: datos.codigo, nombre: datos.nombre },
//   });
//   const userId = creado.data.user?.id;
//   if (!userId) throw creado.error ?? new Error("No se pudo crear la copia en Auth.");
//   await prisma.perfil.upsert({
//     where: { id: userId },
//     update: { profesorId: profesor?.id },
//     create: { id: userId, correo, rol: "DOCENTE", profesorId: profesor?.id },
//   });
//   return correo;
// }
