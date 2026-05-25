import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function ConfigPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  // Double-guard: middleware + layout redirect unauthenticated users.
  // This guard catches authenticated non-admin users. Role is NOT checked in UI only.
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-gray-800 mb-4">Configuração</h1>
      <p className="text-gray-500">
        Configuração de fontes será implementada na Fase 4.
      </p>
    </div>
  );
}
