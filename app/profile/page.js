"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import Header from "../../components/Header";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
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
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, bio, favorite_genres, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setFavoriteGenres(profile.favorite_genres || "");
        setAvatarUrl(profile.avatar_url || "");
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");

    // Простая проверка размера — не больше 5 МБ
    if (file.size > 5 * 1024 * 1024) {
      setMessage("Файл слишком большой (максимум 5 МБ)");
      setUploading(false);
      return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage("Ошибка загрузки: " + uploadError.message);
      setUploading(false);
      return;
    }

    // Получаем публичную ссылку на загруженный файл
    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Добавляем метку времени, чтобы обойти кэширование браузера
    const freshUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: freshUrl })
      .eq("id", userId);

    setUploading(false);

    if (updateError) {
      setMessage("Ошибка сохранения: " + updateError.message);
      return;
    }

    setAvatarUrl(freshUrl);
    setMessage("Аватар обновлён ✓");
  }

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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Загружаем профиль...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink">
      <Header />
      <div className="mx-auto max-w-xl px-6 py-12">
        <div className="mt-8 flex items-center gap-4">
          <label className="group relative cursor-pointer">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-panel font-display text-2xl text-sakura">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Аватар"
                  className="h-full w-full object-cover"
                />
              ) : (
                username ? username[0].toUpperCase() : "?"
              )}
            </div>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/60 text-xs text-paper opacity-0 transition group-hover:opacity-100">
              {uploading ? "..." : "Изменить"}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              disabled={uploading}
              className="hidden"
            />
          </label>
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
