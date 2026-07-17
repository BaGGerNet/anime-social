"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../lib/supabaseClient";
import Header from "../../../../components/Header";

export default function RoomSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId;

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [room, setRoom] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [members, setMembers] = useState([]);
  const [leaving, setLeaving] = useState(false);

  const isOwner = room && userId && room.created_by === userId;

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

      const { data } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      setRoom(data);
      setName(data?.name || "");
      setDescription(data?.description || "");
      setAvatarUrl(data?.avatar_url || "");

      // Загружаем участников комнаты вместе с их профилями
      const { data: memberRows } = await supabase
        .from("room_members")
        .select("user_id, joined_at")
        .eq("room_id", roomId)
        .order("joined_at", { ascending: true });

      const memberIds = (memberRows || []).map((m) => m.user_id);

      let profilesMap = {};
      if (memberIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", memberIds);

        (profilesData || []).forEach((p) => {
          profilesMap[p.id] = p;
        });
      }

      setMembers(
        (memberRows || []).map((m) => ({
          userId: m.user_id,
          username: profilesMap[m.user_id]?.username || "Аноним",
          avatarUrl: profilesMap[m.user_id]?.avatar_url || "",
        }))
      );

      setLoading(false);
    }

    init();
  }, [roomId, router]);

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file || !isOwner) return;

    setUploading(true);
    setMessage("");

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Файл слишком большой (максимум 5 МБ)");
      setUploading(false);
      return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `rooms/${roomId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setMessage("Ошибка загрузки: " + uploadError.message);
      setUploading(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    const freshUrl = `${publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from("chat_rooms")
      .update({ avatar_url: freshUrl })
      .eq("id", roomId);

    setUploading(false);

    if (updateError) {
      setMessage("Ошибка сохранения: " + updateError.message);
      return;
    }

    setAvatarUrl(freshUrl);
    setMessage("Аватар комнаты обновлён ✓");
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!isOwner) return;

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("chat_rooms")
      .update({ name: name.trim(), description: description.trim() || null })
      .eq("id", roomId);

    setSaving(false);

    if (error) {
      setMessage("Ошибка при сохранении: " + error.message);
    } else {
      setMessage("Сохранено ✓");
    }
  }

  async function handleLeave() {
    const confirmed = window.confirm(`Покинуть комнату «${room.name}»?`);
    if (!confirmed) return;

    setLeaving(true);

    const { error } = await supabase
      .from("room_members")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId);

    setLeaving(false);

    if (error) {
      setMessage("Ошибка: " + error.message);
      return;
    }

    router.push("/chat");
  }

  async function handleDelete() {
    if (!isOwner) return;

    const confirmed = window.confirm(
      `Удалить комнату «${room.name}»? Все сообщения в ней тоже будут удалены. Это действие необратимо.`
    );
    if (!confirmed) return;

    setDeleting(true);

    const { error } = await supabase
      .from("chat_rooms")
      .delete()
      .eq("id", roomId);

    setDeleting(false);

    if (error) {
      setMessage("Ошибка при удалении: " + error.message);
      return;
    }

    router.push("/chat");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Загружаем...</p>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Комната не найдена</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink">
      <Header backHref={`/chat/${roomId}`} backLabel="Назад к комнате" />

      <div className="mx-auto max-w-lg px-6 py-10">
        <div className="flex items-center gap-4">
          <label
            className={`group relative ${isOwner ? "cursor-pointer" : ""}`}
          >
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-panel text-2xl font-semibold text-sakura">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Аватар комнаты"
                  className="h-full w-full object-cover"
                />
              ) : (
                room.name[0]?.toUpperCase()
              )}
            </div>
            {isOwner && (
              <>
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
              </>
            )}
          </label>
          <div>
            <h1 className="text-xl font-semibold text-paper">{room.name}</h1>
            <p className="text-sm text-muted">
              {isOwner ? "Вы создатель этой комнаты" : "Профиль комнаты"}
            </p>
          </div>
        </div>

        {isOwner ? (
          <form onSubmit={handleSave} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-muted">
                Название комнаты
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-muted">
                Описание
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
                placeholder="О чём эта комната?"
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
        ) : (
          <div className="mt-8 space-y-2">
            <p className="text-sm text-muted">Описание</p>
            <p className="text-paper">
              {room.description || "Без описания"}
            </p>
            {message && <p className="text-sm text-denki">{message}</p>}
          </div>
        )}

        <div className="mt-8 border-t border-paper/10 pt-6">
          <p className="text-sm text-muted">
            Участники · {members.length}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {members.map((m) => (
              <Link
                key={m.userId}
                href={`/profile/${m.userId}`}
                className="flex items-center gap-3 transition hover:opacity-80"
              >
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-panel text-xs font-semibold text-sakura">
                  {m.avatarUrl ? (
                    <img
                      src={m.avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    m.username[0]?.toUpperCase()
                  )}
                </div>
                <p className="text-sm text-paper">
                  {m.username}
                  {m.userId === room.created_by && (
                    <span className="ml-2 text-xs text-denki">создатель</span>
                  )}
                </p>
              </Link>
            ))}
          </div>
        </div>

        {!isOwner && (
          <div className="mt-6">
            <button
              onClick={handleLeave}
              disabled={leaving}
              className="w-full rounded-full border border-paper/20 px-4 py-3 text-sm font-semibold text-paper transition hover:border-sakura disabled:opacity-50"
            >
              {leaving ? "..." : "Покинуть комнату"}
            </button>
          </div>
        )}

        {isOwner && (
          <div className="mt-10 border-t border-paper/10 pt-6">
            <p className="text-sm text-muted">Опасная зона</p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="mt-3 w-full rounded-full border border-sakura px-4 py-3 text-sm font-semibold text-sakura transition hover:bg-sakura hover:text-ink disabled:opacity-50"
            >
              {deleting ? "Удаляем..." : "Удалить комнату"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
