"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../lib/supabaseClient";
import Header from "../../../../components/Header";

export default function FollowersListPage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.userId;

  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const [followers, setFollowers] = useState([]);

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
        .from("followers")
        .select("follower_id")
        .eq("following_id", profileId);

      const followerIds = (rows || []).map((r) => r.follower_id);

      if (followerIds.length === 0) {
        setFollowers([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", followerIds);

      setFollowers(profiles || []);
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
          Подписчики {profileName}
        </h1>

        <div className="mt-6 flex flex-col gap-2">
          {followers.length === 0 && (
            <p className="text-sm text-muted">Пока нет подписчиков</p>
          )}

          {followers.map((f) => (
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
