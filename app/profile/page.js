"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";

export default function TopicPage() {
  const router = useRouter();
  const params = useParams();
  const topicId = params.topicId;

  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [topic, setTopic] = useState(null);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [avatars, setAvatars] = useState({});
  const bottomRef = useRef(null);

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

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      setUsername(profile?.username || "Аноним");

      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, avatar_url");

      const avatarMap = {};
      (allProfiles || []).forEach((pr) => {
        avatarMap[pr.id] = pr.avatar_url;
      });
      setAvatars(avatarMap);

      const { data: topicData } = await supabase
        .from("forum_topics")
        .select("*")
        .eq("id", topicId)
        .single();

      setTopic(topicData);

      const { data: postsData } = await supabase
        .from("forum_posts")
        .select("*")
        .eq("topic_id", topicId)
        .order("created_at", { ascending: true });

      setPosts(postsData || []);
      setLoading(false);
    }

    init();
  }, [topicId, router]);

  useEffect(() => {
    const channel = supabase
      .channel(`forum_topic_${topicId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "forum_posts",
          filter: `topic_id=eq.${topicId}`,
        },
        (payload) => {
          setPosts((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [topicId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [posts]);

  async function handleReply(e) {
    e.preventDefault();
    if (!content.trim()) return;

    const { error } = await supabase.from("forum_posts").insert({
      topic_id: topicId,
      user_id: userId,
      username,
      content: content.trim(),
    });

    if (!error) {
      setContent("");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Загружаем тему...</p>
      </main>
    );
  }

  if (!topic) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Тема не найдена</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-ink">
      <header className="border-b border-paper/10 px-6 py-4">
        <Link href="/forum" className="text-sm text-muted hover:text-paper">
          ← Назад к форуму
        </Link>
        <div className="mt-2">
          <span className="rounded-full bg-denki/20 px-3 py-1 text-xs font-semibold text-denki">
            {topic.anime_name}
          </span>
          <h1 className="mt-2 text-lg font-semibold text-paper">
            {topic.title}
          </h1>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {posts.map((p) => (
            <div key={p.id} className="flex gap-3 rounded-lg bg-panel px-4 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-xs font-semibold text-sakura">
                {avatars[p.user_id] ? (
                  <img
                    src={avatars[p.user_id]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  p.username[0]?.toUpperCase()
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-denki">{p.username}</p>
                <p className="mt-1 text-sm text-paper">{p.content}</p>
                <p className="mt-2 text-xs text-muted">
                  {new Date(p.created_at).toLocaleString("ru-RU")}
                </p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={handleReply}
        className="mx-auto flex w-full max-w-2xl gap-2 px-6 py-4"
      >
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Написать ответ..."
          className="flex-1 rounded-full border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
        />
        <button
          type="submit"
          className="rounded-full bg-sakura px-6 py-3 font-semibold text-ink transition hover:brightness-110"
        >
          Ответить
        </button>
      </form>
    </main>
  );
}
