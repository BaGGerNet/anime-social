"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../lib/supabaseClient";
import Header from "../../../../components/Header";

export default function FriendsListPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.userId;

  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", profileId)
        .single();

      setProfileName(profile?.username || "Пользователь");

      const { data: rows } = await supabase
        .from("friendships")
        .select("user_one, user_two")
        .or(`user_one.eq.${profileId},user_two.eq.${profileId}`);

      const friendIds = (rows || []).map((r) =>
        r.user_one === profileId ? r.user_two : r.user_one
      );

      if (friendIds.length === 0) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", friendIds);

      setFriends(profiles || []);
      setLoading(false);
    }

    init();
  }, [profileId, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Загружаем...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink">
      <Header backHref={`/profile/${profileId}`} backLabel="Назад к профилю" />

      <div className="mx-auto max-w-lg px-6 py-8">
        <h1 className="text-xl font-semibold text-paper">
          Друзья {profileName}
        </h1>

        <div className="mt-6 flex flex-col gap-2">
          {friends.length === 0 && (
            <p className="text-sm text-muted">Пока нет друзей</p>
          )}

          {friends.map((f) => (
            <Link
              key={f.id}
              href={`/profile/${f.id}`}
              className="flex items-center gap-3 rounded-lg bg-panel px-4 py-3 transition hover:bg-panel/70"
            >
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-ink font-semibold text-sakura">
                {f.avatar_url ? (
                  <img src={f.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (f.username || "?")[0]?.toUpperCase()
                )}
              </div>
              <p className="font-medium text-paper">{f.username || "Без имени"}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
