"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import Header from "../../components/Header";

export default function RoomsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
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

      // Сначала узнаём, в каких комнатах пользователь состоит
      const { data: memberships } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", user.id);

      const roomIds = (memberships || []).map((m) => m.room_id);

      if (roomIds.length === 0) {
        setRooms([]);
        setLoading(false);
        return;
      }

      // Затем загружаем сами эти комнаты
      const { data } = await supabase
        .from("chat_rooms")
        .select("*")
        .in("id", roomIds)
        .order("created_at", { ascending: false });

      setRooms(data || []);
      setLoading(false);
    }

    init();
  }, [router]);

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Загружаем комнаты...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink">
      <Header />

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-paper">Мои комнаты</h1>
          <div className="flex gap-2">
            <Link
              href="/chat/browse"
              className="rounded-full border border-paper/20 px-4 py-2 text-sm font-semibold text-paper transition hover:border-sakura"
            >
              Найти комнаты
            </Link>
            <Link
              href="/chat/new"
              className="rounded-full bg-sakura px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
            >
              + Создать
            </Link>
          </div>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск среди своих комнат..."
          className="mt-4 w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
        />

        <div className="mt-6 flex flex-col gap-3">
          {filtered.length === 0 && (
            <div className="rounded-lg bg-panel px-5 py-6 text-center">
              <p className="text-sm text-muted">
                Вы пока не состоите ни в одной комнате
              </p>
              <Link
                href="/chat/browse"
                className="mt-3 inline-block text-sm text-denki hover:underline"
              >
                Найти комнаты для вступления →
              </Link>
            </div>
          )}

          {filtered.map((r) => (
            <Link
              key={r.id}
              href={`/chat/${r.id}`}
              className="rounded-lg bg-panel px-5 py-4 transition hover:bg-panel/70"
            >
              <h2 className="font-medium text-paper">{r.name}</h2>
              {r.description && (
                <p className="mt-1 text-sm text-muted">{r.description}</p>
              )}
              <p className="mt-2 text-xs text-muted">
                создана {new Date(r.created_at).toLocaleDateString("ru-RU")}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
