"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import Header from "../../../components/Header";

export default function NewRoomPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: room, error: createError } = await supabase
      .from("chat_rooms")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: user.id,
      })
      .select("id")
      .single();

    setLoading(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    router.push(`/chat/${room.id}`);
  }

  return (
    <main className="min-h-screen bg-ink">
      <Header backHref="/chat" backLabel="К списку комнат" />

      <div className="mx-auto max-w-lg px-6 py-12">
        <h1 className="text-xl font-semibold text-paper">Новая комната</h1>
        <p className="mt-1 text-sm text-muted">
          Создайте пространство для общения на любую тему
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
              placeholder="например, Сейнен-клуб"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted">
              Описание (необязательно)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
              placeholder="О чём эта комната?"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-sakura/10 px-4 py-2 text-sm text-sakura">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-sakura py-3 font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Создаём..." : "Создать комнату"}
          </button>
        </form>
      </div>
    </main>
  );
}
