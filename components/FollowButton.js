"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function FollowButton({ currentUserId, profileId }) {
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function check() {
      const { data } = await supabase
        .from("followers")
        .select("follower_id")
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId)
        .maybeSingle();

      setFollowing(!!data);
      setLoading(false);
    }
    check();
  }, [currentUserId, profileId]);

  async function toggleFollow() {
    setBusy(true);

    if (following) {
      await supabase
        .from("followers")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profileId);
      setFollowing(false);
    } else {
      await supabase
        .from("followers")
        .insert({ follower_id: currentUserId, following_id: profileId });
      setFollowing(true);
    }

    setBusy(false);
  }

  if (loading) return null;

  return (
    <button
      onClick={toggleFollow}
      disabled={busy}
      className={
        following
          ? "rounded-full border border-paper/20 px-4 py-2 text-sm font-semibold text-paper transition hover:border-sakura disabled:opacity-50"
          : "rounded-full bg-denki px-4 py-2 text-sm font-semibold text-paper transition hover:brightness-110 disabled:opacity-50"
      }
    >
      {following ? "Отписаться" : "Подписаться"}
    </button>
  );
}
