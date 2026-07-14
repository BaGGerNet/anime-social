"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

const NAV_ITEMS = [
  { href: "/chat", label: "Общий чат" },
  { href: "/messages", label: "Сообщения" },
  { href: "/forum", label: "Форум" },
  { href: "/profile", label: "Профиль" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="flex items-center justify-between border-b border-paper/10 px-6 py-4">
      <Link href="/profile" className="font-display text-2xl text-sakura">
        RES_SCALES
      </Link>

      <nav className="flex items-center gap-5 text-sm">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/messages"
              ? pathname.startsWith("/messages")
              : pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                isActive
                  ? "font-medium text-paper"
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
