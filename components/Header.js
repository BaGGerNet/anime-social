"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import LogoMark from "./LogoMark";

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

  // На «глубоких» страницах (сама переписка, конкретная тема форума)
  // вместо полной навигации показываем компактную ссылку «Назад»
  if (backHref) {
    return (
      <header className="flex items-center justify-between border-b border-paper/10 px-6 py-4">
        <Link href={backHref} className="text-sm text-muted hover:text-paper">
          ← {backLabel || "Назад"}
        </Link>
        <Link href="/profile" className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="font-display text-lg text-sakura">ANIWaku</span>
        </Link>
      </header>
    );
  }

  return (
    <header className="flex flex-col gap-3 border-b border-paper/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
      <Link href="/profile" className="flex shrink-0 items-center gap-2">
        <LogoMark size={32} />
        <span className="font-display text-xl text-sakura sm:text-2xl">
          ANIWaku
        </span>
      </Link>

      <nav className="flex items-center gap-4 overflow-x-auto whitespace-nowrap text-sm [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "shrink-0 font-medium text-sakura"
                  : "shrink-0 text-muted transition hover:text-paper"
              }
            >
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="ml-auto shrink-0 border-l border-paper/10 pl-4 text-muted transition hover:text-paper"
        >
          Выйти
        </button>
      </nav>
    </header>
  );
}

