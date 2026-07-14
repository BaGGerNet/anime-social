"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

const NAV_LINKS = [
  { href: "/chat", label: "Общий чат" },
  { href: "/messages", label: "Сообщения" },
  { href: "/forum", label: "Форум" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", user.id)
        .single();

      setUsername(profile?.username || "");
      setAvatarUrl(profile?.avatar_url || "");
    }

    loadProfile();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function isActive(href) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="relative flex items-center justify-between border-b border-paper/10 px-6 py-4">
      <Link
        href="/profile"
        className="shrink-0 font-display text-2xl tracking-wide text-sakura"
      >
        RES_SCALES
      </Link>

      <nav className="hidden items-center gap-6 text-sm sm:flex">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive(link.href)
                ? "font-semibold text-sakura"
                : "text-muted transition hover:text-paper"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center gap-4">
        <Link
          href="/profile"
          className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-panel text-sm font-semibold text-sakura ring-2 transition ${
            isActive("/profile") ? "ring-sakura" : "ring-transparent"
          }`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            (username ? username[0] : "?").toUpperCase()
          )}
        </Link>

        <button
          onClick={handleLogout}
          className="text-sm text-muted transition hover:text-paper"
        >
          Выйти
        </button>
      </div>

      {/* Мобильная навигация — под основной шапкой на маленьких экранах */}
      <nav className="absolute left-0 right-0 top-full flex justify-center gap-4 border-b border-paper/10 bg-ink px-4 py-2 text-xs sm:hidden">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              isActive(link.href)
                ? "font-semibold text-sakura"
                : "text-muted transition hover:text-paper"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
