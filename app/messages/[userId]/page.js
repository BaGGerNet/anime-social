"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import Header from "../../../components/Header";

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const otherUserId = params.userId;

  const [userId, setUserId] = useState(null);
  const [otherUsername, setOtherUsername] = useState("");
  const [otherAvatar, setOtherAvatar] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
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

      const { data: otherProfile } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", otherUserId)
        .single();

      setOtherUsername(otherProfile?.username || "Пользователь");
      setOtherAvatar(otherProfile?.avatar_url || "");

      // Нормализуем порядок пары id, чтобы не плодить дубликаты переписки
      const [userOne, userTwo] = [user.id, otherUserId].sort();

      // Ищем существующую переписку
      let { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_one", userOne)
        .eq("user_two", userTwo)
        .maybeSingle();

      let convId = existing?.id;

      // Если переписки ещё нет — создаём
      if (!convId) {
        const { data: created, error: createError } = await supabase
          .from("conversations")
          .insert({ user_one: userOne, user_two: userTwo })
          .select("id")
          .single();

        if (createError) {
          console.error(createError);
          setLoading(false);
          return;
        }
        convId = created.id;
      }

      setConversationId(convId);

      const { data: initialMessages } = await supabase
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });

      setMessages(initialMessages || []);
      setLoading(false);
    }

    init();
  }, [otherUserId, router]);

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`conversation_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!content.trim() || !conversationId) return;

    const { error } = await supabase.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: content.trim(),
    });

    if (!error) {
      setContent("");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-muted">Загружаем переписку...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-ink">
      <Header />
      <div className="flex items-center justify-between border-b border-paper/10 px-6 py-3">
        <Link href="/messages" className="text-sm text-muted hover:text-paper">
          ← Назад к списку
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-panel text-xs font-semibold text-sakura">
            {otherAvatar ? (
              <img src={otherAvatar} alt="" className="h-full w-full object-cover" />
            ) : (
              otherUsername[0]?.toUpperCase()
            )}
          </div>
          <p className="font-medium text-paper">{otherUsername}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted">
              Пока нет сообщений — напишите первым
            </p>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-end gap-2 ${
                m.sender_id === userId
                  ? "flex-row-reverse self-end"
                  : "self-start"
              }`}
            >
              {m.sender_id !== userId && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-panel text-xs font-semibold text-sakura">
                  {otherAvatar ? (
                    <img
                      src={otherAvatar}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    otherUsername[0]?.toUpperCase()
                  )}
                </div>
              )}
              <div
                className={`speech-bubble max-w-md px-4 py-2 ${
                  m.sender_id === userId
                    ? "bg-sakura text-ink"
                    : "bg-panel text-paper"
                }`}
              >
                <p className="text-sm">{m.content}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form
        onSubmit={handleSend}
        className="mx-auto flex w-full max-w-2xl gap-2 px-6 py-4"
      >
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`Написать ${otherUsername}...`}
          className="flex-1 rounded-full border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
        />
        <button
          type="submit"
          className="rounded-full bg-sakura px-6 py-3 font-semibold text-ink transition hover:brightness-110"
        >
          Отправить
        </button>
      </form>
    </main>
  );
}
