"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import Header from "../../components/Header";

export default function ForumPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState([]);
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

      const { data } = await supabase
        .from("forum_topics")
        .select("*")
        .order("created_at", { ascending: false });

      setTopics(data || []);
      setLoading(false);
    }

    init();
  }, [router]);

  const filtered = topics.filter((t) =>
    t.anime_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Загружаем форум...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink">
      <Header />
      <div className="mx-auto max-w-2xl px-6 py-8">

        <div className="mt-8 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-paper">Форум по тайтлам</h1>
          <Link
            href="/forum/new"
            className="rounded-full bg-sakura px-5 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            + Новая тема
          </Link>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию аниме..."
          className="mt-4 w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
        />

        <div className="mt-6 flex flex-col gap-3">
          {filtered.length === 0 && (
            <p className="text-sm text-muted">
              Пока нет тем — станьте первым, кто начнёт обсуждение
            </p>
          )}

          {filtered.map((t) => (
            <Link
              key={t.id}
              href={`/forum/${t.id}`}
              className="rounded-lg bg-panel px-5 py-4 transition hover:bg-panel/70"
            >
              <span className="rounded-full bg-denki/20 px-3 py-1 text-xs font-semibold text-denki">
                {t.anime_name}
              </span>
              <h2 className="mt-2 font-medium text-paper">{t.title}</h2>
              <p className="mt-1 text-xs text-muted">
                от {t.username} ·{" "}
                {new Date(t.created_at).toLocaleDateString("ru-RU")}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
