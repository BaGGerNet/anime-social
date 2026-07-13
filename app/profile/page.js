"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, bio, favorite_genres")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setFavoriteGenres(profile.favorite_genres || "");
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("profiles")
      .update({ username, bio, favorite_genres: favoriteGenres })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      setMessage("Ошибка при сохранении: " + error.message);
    } else {
      setMessage("Сохранено ✓");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Загружаем профиль...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink px-6 py-12">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-display text-3xl text-sakura">
            CIRCLE
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-muted hover:text-paper"
          >
            Выйти
          </button>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-panel font-display text-2xl text-sakura">
            {username ? username[0].toUpperCase() : "?"}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-paper">
              {username || "Без имени"}
            </h1>
            <p className="text-sm text-muted">{email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-10 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted">Никнейм</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted">О себе</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
              placeholder="Расскажи, что смотришь и что любишь"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted">
              Любимые жанры
            </label>
            <input
              type="text"
              value={favoriteGenres}
              onChange={(e) => setFavoriteGenres(e.target.value)}
              className="w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
              placeholder="сёнен, психологическое, слайс оф лайф"
            />
          </div>

          {message && <p className="text-sm text-denki">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-full bg-sakura py-3 font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Сохраняем..." : "Сохранить изменения"}
          </button>
        </form>
      </div>
    </main>
  );
}
