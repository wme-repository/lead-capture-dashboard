"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Plug,
  FlaskConical,
  Puzzle,
  Settings,
  Table2,
  GitFork,
} from "lucide-react";
import ThemeToggle from "./theme-toggle";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/fontes", label: "Fontes", icon: Plug },
  { href: "/ab-tests", label: "A/B Tests", icon: FlaskConical },
  { href: "/integracoes", label: "Integrações", icon: Puzzle },
  { href: "/atribuicao", label: "Atribuição", icon: GitFork },
  { href: "/planilhas", label: "Planilhas", icon: Table2 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function Sidebar({
  user,
}: {
  user: { email: string; role?: string | null };
}) {
  const pathname = usePathname();
  const initials = user.email.slice(0, 2).toUpperCase();

  return (
    <aside className="hidden md:flex w-[200px] shrink-0 flex-col gap-5 border-r border-gray-200 bg-white px-3 py-4">
      <div className="flex items-center gap-2 px-2">
        <Image src="/logo-esq.png" alt="Esquadrão de Elite" width={28} height={28} className="h-7 w-7 shrink-0 rounded-lg object-contain" />
        <span className="text-sm font-semibold text-gray-800">Leads Dashboard</span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                active
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-gray-100 pt-2">
        <ThemeToggle />
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 text-xs font-medium text-blue-700">
            {initials}
          </div>
          <div className="leading-tight">
            <div className="text-xs font-medium text-gray-800">
              {user.role === "admin" ? "Admin" : "Usuário"}
            </div>
            <div className="max-w-[120px] truncate text-[11px] text-gray-400">{user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
