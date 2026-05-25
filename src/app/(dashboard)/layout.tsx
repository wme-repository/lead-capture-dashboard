import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Double-check session cryptographically (middleware only checks cookie presence)
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-800">Leads Dashboard</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session.user.email}</span>
          {session.user.role === "admin" && (
            <a href="/config" className="text-sm text-blue-600 hover:underline">
              Configuração
            </a>
          )}
          {session.user.role === "admin" && (
            <a href="/admin" className="text-sm text-blue-600 hover:underline">
              Usuários
            </a>
          )}
        </div>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
