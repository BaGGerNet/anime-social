"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import Header from "../../../components/Header";
import PostComposer from "../../../components/PostComposer";
import PostsList from "../../../components/PostsList";
import FriendButton from "../../../components/FriendButton";

export default function ViewProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.userId;

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const isOwner = currentUserId === profileId;

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setCurrentUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("username, bio, favorite_genres, avatar_url, cover_url")
        .eq("id", profileId)
        .single();

      setProfile(data);

      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });

      setPosts(postsData || []);

      const { count: friendsCnt } = await supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .or(`user_one.eq.${profileId},user_two.eq.${profileId}`);

      const { count: followersCnt } = await supabase
        .from("followers")
        .select("follower_id", { count: "exact", head: true })
        .eq("following_id", profileId);

      setFriendsCount(friendsCnt || 0);
      setFollowersCount(followersCnt || 0);

      if (user.id === profileId) {
        const { count: pendingCnt } = await supabase
          .from("friend_requests")
          .select("id", { count: "exact", head: true })
          .eq("to_user", profileId);
        setPendingRequestsCount(pendingCnt || 0);
      }

      setLoading(false);
    }

    init();
  }, [profileId, router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Загружаем профиль...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-ink">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-muted">Профиль не найден</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink">
      <Header />

      {/* Обложка + аватар поверх неё по центру */}
      <div className="relative">
        <div className="h-40 w-full overflow-hidden bg-panel sm:h-56">
          {profile.cover_url ? (
            <img
              src={profile.cover_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-panel to-ink" />
          )}
        </div>

        <div className="absolute left-1/2 top-full flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-4 border-ink bg-panel font-display text-3xl text-sakura">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Аватар"
              className="h-full w-full object-cover"
            />
          ) : (
            (profile.username || "?")[0]?.toUpperCase()
          )}
        </div>
      </div>

      <div className="mx-auto max-w-xl px-6 pb-12 pt-16 text-center">
        <h1 className="text-xl font-semibold text-paper">
          {profile.username || "Без имени"}
        </h1>
        {isOwner && <p className="mt-1 text-sm text-muted">Это ваш профиль</p>}

        <div className="mt-3 flex justify-center gap-4 text-sm">
          <Link
            href={`/profile/${profileId}/friends`}
            className="text-muted transition hover:text-paper"
          >
            <span className="font-semibold text-paper">{friendsCount}</span>{" "}
            друзей
          </Link>
          <Link
            href={`/profile/${profileId}/followers`}
            className="text-muted transition hover:text-paper"
          >
            <span className="font-semibold text-paper">{followersCount}</span>{" "}
            подписчиков
          </Link>
        </div>

        <div className="mt-4 flex justify-center gap-2">
          {isOwner ? (
            <>
              <Link
                href="/profile/edit"
                className="rounded-full border border-paper/20 px-5 py-2 text-sm font-semibold text-paper transition hover:border-sakura"
              >
                Редактировать
              </Link>
              <Link
                href="/friends/requests"
                className="rounded-full border border-paper/20 px-5 py-2 text-sm font-semibold text-paper transition hover:border-sakura"
              >
                Заявки в друзья
                {pendingRequestsCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-sakura px-1.5 py-0.5 text-xs text-ink">
                    {pendingRequestsCount}
                  </span>
                )}
              </Link>
            </>
          ) : (
            <FriendButton currentUserId={currentUserId} profileId={profileId} />
          )}
        </div>

        <div className="mt-8 space-y-6 text-left">
          <div>
            <p className="text-sm text-muted">О себе</p>
            <p className="mt-1 text-paper">
              {profile.bio || "Пользователь пока ничего не рассказал о себе"}
            </p>
          </div>

          <div>
            <p className="text-sm text-muted">Любимые жанры</p>
            <p className="mt-1 text-paper">
              {profile.favorite_genres || "Не указаны"}
            </p>
          </div>
        </div>

        {!isOwner && (
          <Link
            href={`/messages/${profileId}`}
            className="mt-10 inline-block rounded-full bg-sakura px-6 py-3 text-sm font-semibold text-ink transition hover:brightness-110"
          >
            Написать сообщение
          </Link>
        )}

        <div className="mt-10 border-t border-paper/10 pt-8 text-left">
          <h2 className="text-lg font-semibold text-paper">Посты</h2>

          {isOwner && (
            <div className="mt-4">
              <PostComposer
                userId={currentUserId}
                username={profile.username || "Аноним"}
                avatarUrl={profile.avatar_url}
                onPosted={(newPost) => setPosts((prev) => [newPost, ...prev])}
              />
            </div>
          )}

          <PostsList
            posts={posts}
            currentUserId={currentUserId}
            onDeleted={(id) =>
              setPosts((prev) => prev.filter((p) => p.id !== id))
            }
          />
        </div>
      </div>
    </main>
  );
}
