import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "./_components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <Sidebar user={{ email: session.user.email, role: session.user.role }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3 md:hidden">
          <span className="font-semibold text-gray-800">Leads Dashboard</span>
          <span className="text-xs text-gray-500">{session.user.email}</span>
        </header>
        <main className="min-w-0 flex-1 p-5 md:p-7">{children}</main>
      </div>
    </div>
  );
}
