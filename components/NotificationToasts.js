"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

export default function NotificationToasts() {
  const pathname = usePathname();
  const router = useRouter();
  const [toasts, setToasts] = useState([]);

  const pathnameRef = useRef(pathname);
  const userIdRef = useRef(null);
  const conversationsRef = useRef({}); // conversation_id -> id собеседника
  const channelsRef = useRef([]);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  function pushToast(toast) {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }

  function dismissToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function setupSubscriptions(userId) {
    // Убираем старые подписки, если были (например, после повторного входа)
    channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    channelsRef.current = [];

    userIdRef.current = userId;

    // Загружаем все переписки пользователя, чтобы понимать,
    // от кого пришло сообщение в личку
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, user_one, user_two")
      .or(`user_one.eq.${userId},user_two.eq.${userId}`);

    const map = {};
    (convs || []).forEach((c) => {
      map[c.id] = c.user_one === userId ? c.user_two : c.user_one;
    });
    conversationsRef.current = map;

    const roomChannel = supabase
      .channel(`toast_rooms_${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages" },
        async (payload) => {
          const m = payload.new;
          if (m.user_id === userIdRef.current) return;
          if (m.is_system) return;
          if (pathnameRef.current === `/chat/${m.room_id}`) return;

          pushToast({
            title: `${m.username} · Комната`,
            body: m.content,
            href: `/chat/${m.room_id}`,
          });
        }
      )
      .subscribe();

    const dmChannel = supabase
      .channel(`toast_dm_${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        async (payload) => {
          const m = payload.new;
          if (m.sender_id === userIdRef.current) return;

          const otherId = conversationsRef.current[m.conversation_id];
          if (!otherId) return; // сообщение не из нашей переписки
          if (pathnameRef.current === `/messages/${otherId}`) return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", m.sender_id)
            .single();

          pushToast({
            title: `${profile?.username || "Сообщение"} · Личные сообщения`,
            body: m.content,
            href: `/messages/${otherId}`,
          });
        }
      )
      .subscribe();

    // Если пользователь начал новую переписку уже после загрузки —
    // добавляем её в карту "на лету"
    const convChannel = supabase
      .channel(`toast_conv_${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations" },
        (payload) => {
          const c = payload.new;
          if (c.user_one === userId || c.user_two === userId) {
            conversationsRef.current[c.id] =
              c.user_one === userId ? c.user_two : c.user_one;
          }
        }
      )
      .subscribe();

    channelsRef.current = [roomChannel, dmChannel, convChannel];
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && mounted) {
        setupSubscriptions(user.id);
      }
    }

    init();

    // Если человек логинится уже после того, как компонент загрузился
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setupSubscriptions(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
        channelsRef.current = [];
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      channelsRef.current.forEach((ch) => supabase.removeChannel(ch));
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            router.push(t.href);
            dismissToast(t.id);
          }}
          className="animate-[fadeIn_0.2s_ease-out] rounded-lg border border-paper/10 bg-panel px-4 py-3 text-left shadow-xl transition hover:bg-panel/80"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold text-sakura">{t.title}</p>
            <span
              onClick={(e) => {
                e.stopPropagation();
                dismissToast(t.id);
              }}
              className="text-xs text-muted hover:text-paper"
            >
              ✕
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-paper">{t.body}</p>
        </button>
      ))}
    </div>
  );
}
