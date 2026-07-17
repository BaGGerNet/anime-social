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

      const { data } = await supabase
        .from("chat_rooms")
        .select("*")
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
          <h1 className="text-xl font-semibold text-paper">Комнаты</h1>
          <Link
            href="/chat/new"
            className="rounded-full bg-sakura px-5 py-2 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            + Создать комнату
          </Link>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск комнаты..."
          className="mt-4 w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
        />

        <div className="mt-6 flex flex-col gap-3">
          {filtered.length === 0 && (
            <p className="text-sm text-muted">
              Пока нет комнат — станьте первым, кто создаст пространство для
              общения
            </p>
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
