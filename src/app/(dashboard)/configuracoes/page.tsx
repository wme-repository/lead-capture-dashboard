import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import { Users, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const isAdmin = session?.user.role === "admin";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Configurações</h1>
        <p className="mt-1 text-xs text-gray-500">Conta e administração.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 text-sm font-medium text-gray-800">Sua conta</div>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Nome</dt>
            <dd className="text-gray-800">{session?.user.name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">E-mail</dt>
            <dd className="text-gray-800">{session?.user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Papel</dt>
            <dd className="text-gray-800">{isAdmin ? "Administrador" : "Usuário"}</dd>
          </div>
        </dl>
      </div>

      {isAdmin && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-800">
            <ShieldCheck size={16} className="text-gray-500" /> Administração
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
          >
            <Users size={16} /> Gerenciar usuários
          </Link>
        </div>
      )}
    </div>
  );
}
