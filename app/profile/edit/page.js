"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Header from "../../../components/Header";

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [favoriteGenres, setFavoriteGenres] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
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

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, bio, favorite_genres, avatar_url, cover_url")
        .eq("id", user.id)
        .single();

      if (profile) {
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setFavoriteGenres(profile.favorite_genres || "");
        setAvatarUrl(profile.avatar_url || "");
        setCoverUrl(profile.cover_url || "");
      }

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setMessage("");

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Файл слишком большой (максимум 5 МБ)");
      setUploadingAvatar(false);
      return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage("Ошибка загрузки: " + uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const freshUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: freshUrl })
      .eq("id", userId);

    setUploadingAvatar(false);

    if (updateError) {
      setMessage("Ошибка сохранения: " + updateError.message);
      return;
    }

    setAvatarUrl(freshUrl);
    setMessage("Аватар обновлён ✓");
  }

  async function handleCoverChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    setMessage("");

    if (file.size > 8 * 1024 * 1024) {
      setMessage("Файл слишком большой (максимум 8 МБ)");
      setUploadingCover(false);
      return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/cover.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage("Ошибка загрузки: " + uploadError.message);
      setUploadingCover(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const freshUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ cover_url: freshUrl })
      .eq("id", userId);

    setUploadingCover(false);

    if (updateError) {
      setMessage("Ошибка сохранения: " + updateError.message);
      return;
    }

    setCoverUrl(freshUrl);
    setMessage("Обложка обновлена ✓");
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({ username, bio, favorite_genres: favoriteGenres })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      setMessage("Ошибка при сохранении: " + error.message);
      return;
    }

    router.push(`/profile/${userId}`);
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

      {/* Обложка с аватаром поверх — предпросмотр того, как будет выглядеть профиль */}
      <div className="relative">
        <label className="group relative block h-40 w-full cursor-pointer overflow-hidden bg-panel sm:h-56">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-panel to-ink" />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-ink/50 text-sm text-paper opacity-0 transition group-hover:opacity-100">
            {uploadingCover ? "Загружаем..." : "📷 Изменить обложку"}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            disabled={uploadingCover}
            className="hidden"
          />
        </label>

        <label className="group absolute left-1/2 top-full flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-ink bg-panel font-display text-3xl text-sakura">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Аватар" className="h-full w-full object-cover" />
          ) : (
            username ? username[0].toUpperCase() : "?"
          )}
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/60 text-xs text-paper opacity-0 transition group-hover:opacity-100">
            {uploadingAvatar ? "..." : "Изменить"}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            disabled={uploadingAvatar}
            className="hidden"
          />
        </label>
      </div>

      <div className="mx-auto max-w-xl px-6 pb-12 pt-16">
        <h1 className="text-center text-xl font-semibold text-paper">
          Редактирование профиля
        </h1>
        <p className="mt-1 text-center text-xs text-muted">
          Нажмите на обложку или аватар, чтобы заменить
        </p>

        <form onSubmit={handleSave} className="mt-8 space-y-4">
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
