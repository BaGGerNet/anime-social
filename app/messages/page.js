"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function MessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [people, setPeople] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      // Все профили, кроме своего собственного
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, favorite_genres")
        .neq("id", user.id);

      setPeople(profiles || []);
      setLoading(false);
    }

    init();
  }, [router]);

  const filtered = people.filter((p) =>
    (p.username || "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Загружаем список...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink px-6 py-8">
      <div className="mx-auto max-w-xl">
        <header className="flex items-center justify-between">
          <Link href="/profile" className="font-display text-2xl text-sakura">
            CIRCLE
          </Link>
          <div className="flex gap-4 text-sm">
            <Link href="/chat" className="text-muted hover:text-paper">
              Общий чат
            </Link>
            <Link href="/profile" className="text-muted hover:text-paper">
              Профиль
            </Link>
          </div>
        </header>

        <h1 className="mt-8 text-xl font-semibold text-paper">
          Личные сообщения
        </h1>
        <p className="mt-1 text-sm text-muted">
          Выберите человека, чтобы начать переписку
        </p>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по никнейму..."
          className="mt-4 w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
        />

        <div className="mt-6 flex flex-col gap-2">
          {filtered.length === 0 && (
            <p className="text-sm text-muted">Никого не найдено</p>
          )}

          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/messages/${p.id}`}
              className="flex items-center gap-3 rounded-lg bg-panel px-4 py-3 transition hover:bg-panel/70"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink font-display text-lg text-sakura">
                {(p.username || "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-paper">
                  {p.username || "Без имени"}
                </p>
                {p.favorite_genres && (
                  <p className="text-xs text-muted">{p.favorite_genres}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
