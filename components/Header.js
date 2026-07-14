"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

const navItems = [
  { href: "/chat", label: "Комнаты" },
  { href: "/messages", label: "Сообщения" },
  { href: "/forum", label: "Форум" },
  { href: "/profile", label: "Профиль" },
];

export default function Header({ backHref, backLabel }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (backHref) {
    return (
      <header className="flex items-center justify-between border-b border-paper/10 px-6 py-4">
        <Link href={backHref} className="text-sm text-muted hover:text-paper">
          ← {backLabel || "Назад"}
        </Link>
        <Link href="/profile" className="font-display text-xl text-sakura">
          RES_SCALES
        </Link>
      </header>
    );
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-paper/10 px-6 py-4">
      <Link href="/profile" className="font-display text-2xl text-sakura">
        RES_SCALES
      </Link>

      <nav className="flex flex-wrap items-center gap-4 text-sm">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "font-medium text-sakura"
                  : "text-muted transition hover:text-paper"
              }
            >
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="text-muted transition hover:text-paper"
        >
          Выйти
        </button>
      </nav>
    </header>
  );
}
