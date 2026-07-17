"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabaseClient";
import Header from "../../../components/Header";

export default function RoomsPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId;

  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
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
      (allProfiles || []).forEach((p) => {
        avatarMap[p.id] = p.avatar_url;
      });
      setAvatars(avatarMap);

      const { data: roomData } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      setRoom(roomData);

      const { data: initialMessages } = await supabase
        .from("room_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(100);

      setMessages(initialMessages || []);
      setLoading(false);
    }

    init();
  }, [roomId, router]);

  useEffect(() => {
    const channel = supabase
      .channel(`room_${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!content.trim()) return;

    const { error } = await supabase.from("room_messages").insert({
      room_id: roomId,
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
        <p className="text-muted">Загружаем комнату...</p>
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
    <main className="flex min-h-screen flex-col bg-ink">
      <Header backHref="/chat" backLabel="К списку комнат" />

      <Link
        href={`/chat/${roomId}/settings`}
        className="flex items-center gap-3 border-b border-paper/10 px-6 py-3 transition hover:bg-panel/40"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-panel text-sm font-semibold text-sakura">
          {room.avatar_url ? (
            <img
              src={room.avatar_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            room.name[0]?.toUpperCase()
          )}
        </div>
        <div>
          <h1 className="font-medium text-paper">{room.name}</h1>
          {room.description && (
            <p className="text-xs text-muted">{room.description}</p>
          )}
        </div>
      </Link>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted">
              Пока тихо — напишите первое сообщение
            </p>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-end gap-2 ${
                m.user_id === userId
                  ? "flex-row-reverse self-end"
                  : "self-start"
              }`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-panel text-xs font-semibold text-sakura">
                {avatars[m.user_id] ? (
                  <img
                    src={avatars[m.user_id]}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  m.username[0]?.toUpperCase()
                )}
              </div>
              <div
                className={`speech-bubble max-w-md px-4 py-2 ${
                  m.user_id === userId
                    ? "bg-sakura text-ink"
                    : "bg-panel text-paper"
                }`}
              >
                {m.user_id !== userId && (
                  <p className="mb-1 text-xs font-semibold text-denki">
                    {m.username}
                  </p>
                )}
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
          placeholder={`Написать в «${room.name}»...`}
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
