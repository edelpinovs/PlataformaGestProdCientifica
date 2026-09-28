import { FormularioLogin } from "./formulario";

const AVISOS: Record<string, string> = {
  "enlace-invalido": "El enlace del correo ya se usó o caducó. Pide que te envíen una invitación nueva.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  return <FormularioLogin aviso={typeof error === "string" ? AVISOS[error] : undefined} />;
}
