"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import Header from "../../../components/Header";

export default function NewTopicPage() {
  const router = useRouter();
  const [animeName, setAnimeName] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    const username = profile?.username || "Аноним";

    // 1. Создаём саму тему
    const { data: topic, error: topicError } = await supabase
      .from("forum_topics")
      .insert({
        anime_name: animeName.trim(),
        title: title.trim(),
        username,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (topicError) {
      setError(topicError.message);
      setLoading(false);
      return;
    }

    // 2. Создаём первое сообщение в теме
    const { error: postError } = await supabase.from("forum_posts").insert({
      topic_id: topic.id,
      user_id: user.id,
      username,
      content: content.trim(),
    });

    setLoading(false);

    if (postError) {
      setError(postError.message);
      return;
    }

    router.push(`/forum/${topic.id}`);
  }

  return (
    <main className="min-h-screen bg-ink">
      <Header />
      <div className="flex justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          <Link href="/forum" className="text-sm text-muted hover:text-paper">
            ← Назад к форуму
          </Link>

        <h1 className="mt-4 text-xl font-semibold text-paper">
          Новая тема обсуждения
        </h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted">
              Название аниме
            </label>
            <input
              type="text"
              required
              value={animeName}
              onChange={(e) => setAnimeName(e.target.value)}
              className="w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
              placeholder="например, Frieren: Beyond Journey's End"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted">
              Заголовок темы
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
              placeholder="например, Как вам концовка сезона?"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted">
              Первое сообщение
            </label>
            <textarea
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
              placeholder="Расскажите, что хотите обсудить..."
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
            {loading ? "Создаём..." : "Создать тему"}
          </button>
        </form>
        </div>
      </div>
    </main>
  );
}
