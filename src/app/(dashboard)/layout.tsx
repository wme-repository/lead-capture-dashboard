import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "./_components/sidebar";
import ThemeToggle from "./_components/theme-toggle";

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
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{session.user.email}</span>
            <ThemeToggle compact />
          </div>
        </header>
        <main className="min-w-0 flex-1 p-5 md:p-7">{children}</main>
      </div>
    </div>
  );
}
