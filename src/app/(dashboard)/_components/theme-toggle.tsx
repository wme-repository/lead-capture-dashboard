"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-label={dark ? "Modo claro" : "Modo escuro"}
        className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-800"
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
      {dark ? "Modo claro" : "Modo escuro"}
    </button>
  );
}
