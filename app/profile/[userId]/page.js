"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import Header from "../../../components/Header";
import PostComposer from "../../../components/PostComposer";
import PostsList from "../../../components/PostsList";

export default function ViewProfilePage() {
  const router = useRouter();
  const params = useParams();
  const profileId = params.userId;

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);

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
        .select("username, bio, favorite_genres, avatar_url")
        .eq("id", profileId)
        .single();

      setProfile(data);

      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });

      setPosts(postsData || []);
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

      <div className="mx-auto max-w-xl px-6 py-12">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-panel font-display text-2xl text-sakura">
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
            <div>
              <h1 className="text-xl font-semibold text-paper">
                {profile.username || "Без имени"}
              </h1>
              {isOwner && (
                <p className="text-sm text-muted">Это ваш профиль</p>
              )}
            </div>
          </div>

          {isOwner && (
            <Link
              href="/profile/edit"
              className="shrink-0 rounded-full border border-paper/20 px-4 py-2 text-sm font-semibold text-paper transition hover:border-sakura"
            >
              Редактировать
            </Link>
          )}
        </div>

        <div className="mt-8 space-y-6">
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

        <div className="mt-10 border-t border-paper/10 pt-8">
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
