"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Header from "../../../components/Header";

export default function BrowseRoomsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [myRoomIds, setMyRoomIds] = useState(new Set());
  const [search, setSearch] = useState("");
  const [joiningId, setJoiningId] = useState(null);

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

      const { data: allRooms } = await supabase
        .from("chat_rooms")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: memberships } = await supabase
        .from("room_members")
        .select("room_id")
        .eq("user_id", user.id);

      setRooms(allRooms || []);
      setMyRoomIds(new Set((memberships || []).map((m) => m.room_id)));
      setLoading(false);
    }

    init();
  }, [router]);

  async function handleJoin(roomId) {
    setJoiningId(roomId);

    const { error } = await supabase.from("room_members").insert({
      room_id: roomId,
      user_id: userId,
    });

    setJoiningId(null);

    if (!error) {
      setMyRoomIds((prev) => new Set(prev).add(roomId));
      router.push(`/chat/${roomId}`);
    }
  }

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
      <Header backHref="/chat" backLabel="К моим комнатам" />

      <div className="mx-auto max-w-2xl px-6 py-8">
        <h1 className="text-xl font-semibold text-paper">Все комнаты</h1>
        <p className="mt-1 text-sm text-muted">
          Вступайте в комнаты, которые вам интересны
        </p>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск комнаты..."
          className="mt-4 w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
        />

        <div className="mt-6 flex flex-col gap-3">
          {filtered.length === 0 && (
            <p className="text-sm text-muted">Комнат пока нет</p>
          )}

          {filtered.map((r) => {
            const isMember = myRoomIds.has(r.id);
            return (
              <div
                key={r.id}
                className="flex items-center justify-between gap-4 rounded-lg bg-panel px-5 py-4"
              >
                <div>
                  <h2 className="font-medium text-paper">{r.name}</h2>
                  {r.description && (
                    <p className="mt-1 text-sm text-muted">{r.description}</p>
                  )}
                </div>

                {isMember ? (
                  <button
                    onClick={() => router.push(`/chat/${r.id}`)}
                    className="shrink-0 rounded-full border border-paper/20 px-4 py-2 text-sm font-semibold text-paper transition hover:border-sakura"
                  >
                    Зайти
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoin(r.id)}
                    disabled={joiningId === r.id}
                    className="shrink-0 rounded-full bg-sakura px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
                  >
                    {joiningId === r.id ? "..." : "Вступить"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
