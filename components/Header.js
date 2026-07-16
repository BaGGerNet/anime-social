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

// Значок логотипа — тот же дизайн, что и отдельный SVG-файл,
// но встроенный прямо в компонент, чтобы не грузить картинку отдельным файлом
function LogoMark({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <clipPath id="headerLogoClip">
          <circle cx="100" cy="100" r="92" />
        </clipPath>
        <pattern id="headerLogoDots" width="14" height="14" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.6" fill="#FF5C8A" opacity="0.25" />
        </pattern>
      </defs>
      <circle cx="100" cy="100" r="96" fill="#0E0E13" />
      <circle cx="100" cy="100" r="92" fill="#17171F" stroke="#FF5C8A" strokeWidth="3" />
      <g clipPath="url(#headerLogoClip)">
        <rect x="8" y="8" width="184" height="184" fill="url(#headerLogoDots)" />
      </g>
      <path d="M 62 148 L 62 168 L 84 148 Z" fill="#4D7CFF" />
      <text
        x="100"
        y="128"
        textAnchor="middle"
        fontFamily="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
        fontWeight="900"
        fontSize="100"
        fill="#F4F1E9"
      >
        A
      </text>
      <circle cx="146" cy="62" r="9" fill="#FF5C8A" />
    </svg>
  );
}

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
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-paper/10 px-6 py-4">
      <Link href="/profile" className="flex items-center gap-2">
        <LogoMark size={36} />
        <span className="font-display text-2xl text-sakura">ANIWaku</span>
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

