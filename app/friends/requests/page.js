"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Header from "../../../components/Header";

export default function FriendRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [incoming, setIncoming] = useState([]);
  const [busyId, setBusyId] = useState(null);

  async function loadRequests(currentUserId) {
    const { data: requests } = await supabase
      .from("friend_requests")
      .select("id, from_user, created_at")
      .eq("to_user", currentUserId)
      .order("created_at", { ascending: false });

    const fromIds = (requests || []).map((r) => r.from_user);

    let profilesMap = {};
    if (fromIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", fromIds);

      (profiles || []).forEach((p) => {
        profilesMap[p.id] = p;
      });
    }

    setIncoming(
      (requests || []).map((r) => ({
        requestId: r.id,
        userId: r.from_user,
        username: profilesMap[r.from_user]?.username || "Аноним",
        avatarUrl: profilesMap[r.from_user]?.avatar_url || "",
      }))
    );
  }

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
      await loadRequests(user.id);
      setLoading(false);
    }

    init();
  }, [router]);

  async function handleAccept(requestId) {
    setBusyId(requestId);
    const { error } = await supabase.rpc("accept_friend_request", {
      req_id: requestId,
    });
    setBusyId(null);
    if (!error) {
      setIncoming((prev) => prev.filter((r) => r.requestId !== requestId));
    }
  }

  async function handleDecline(requestId) {
    setBusyId(requestId);
    await supabase.from("friend_requests").delete().eq("id", requestId);
    setBusyId(null);
    setIncoming((prev) => prev.filter((r) => r.requestId !== requestId));
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Загружаем...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink">
      <Header backHref={`/profile/${userId}`} backLabel="Назад к профилю" />

      <div className="mx-auto max-w-lg px-6 py-8">
        <h1 className="text-xl font-semibold text-paper">Заявки в друзья</h1>

        <div className="mt-6 flex flex-col gap-3">
          {incoming.length === 0 && (
            <p className="text-sm text-muted">Пока нет новых заявок</p>
          )}

          {incoming.map((r) => (
            <div
              key={r.requestId}
              className="flex items-center justify-between gap-3 rounded-lg bg-panel px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ink font-semibold text-sakura">
                  {r.avatarUrl ? (
                    <img src={r.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    r.username[0]?.toUpperCase()
                  )}
                </div>
                <p className="font-medium text-paper">{r.username}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(r.requestId)}
                  disabled={busyId === r.requestId}
                  className="rounded-full bg-sakura px-3 py-1.5 text-xs font-semibold text-ink disabled:opacity-50"
                >
                  Принять
                </button>
                <button
                  onClick={() => handleDecline(r.requestId)}
                  disabled={busyId === r.requestId}
                  className="rounded-full border border-paper/20 px-3 py-1.5 text-xs font-semibold text-paper disabled:opacity-50"
                >
                  Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
