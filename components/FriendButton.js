"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Возможные состояния: none, friends, sent (я отправил заявку),
// received (мне прислали заявку — можно принять/отклонить)
export default function FriendButton({ currentUserId, profileId }) {
  const [status, setStatus] = useState("loading");
  const [requestId, setRequestId] = useState(null);
  const [busy, setBusy] = useState(false);

  async function loadStatus() {
    const [u1, u2] =
      currentUserId < profileId
        ? [currentUserId, profileId]
        : [profileId, currentUserId];

    const { data: friendship } = await supabase
      .from("friendships")
      .select("id")
      .eq("user_one", u1)
      .eq("user_two", u2)
      .maybeSingle();

    if (friendship) {
      setStatus("friends");
      return;
    }

    const { data: sentReq } = await supabase
      .from("friend_requests")
      .select("id")
      .eq("from_user", currentUserId)
      .eq("to_user", profileId)
      .maybeSingle();

    if (sentReq) {
      setStatus("sent");
      setRequestId(sentReq.id);
      return;
    }

    const { data: receivedReq } = await supabase
      .from("friend_requests")
      .select("id")
      .eq("from_user", profileId)
      .eq("to_user", currentUserId)
      .maybeSingle();

    if (receivedReq) {
      setStatus("received");
      setRequestId(receivedReq.id);
      return;
    }

    setStatus("none");
  }

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId, profileId]);

  async function sendRequest() {
    setBusy(true);
    const { error } = await supabase
      .from("friend_requests")
      .insert({ from_user: currentUserId, to_user: profileId });
    setBusy(false);
    if (!error) await loadStatus();
  }

  async function cancelRequest() {
    setBusy(true);
    await supabase.from("friend_requests").delete().eq("id", requestId);
    setBusy(false);
    setStatus("none");
  }

  async function acceptRequest() {
    setBusy(true);
    const { error } = await supabase.rpc("accept_friend_request", {
      req_id: requestId,
    });
    setBusy(false);
    if (!error) setStatus("friends");
  }

  async function declineRequest() {
    setBusy(true);
    await supabase.from("friend_requests").delete().eq("id", requestId);
    setBusy(false);
    setStatus("none");
  }

  async function removeFriend() {
    const confirmed = window.confirm("Удалить из друзей?");
    if (!confirmed) return;

    setBusy(true);
    const [u1, u2] =
      currentUserId < profileId
        ? [currentUserId, profileId]
        : [profileId, currentUserId];

    await supabase
      .from("friendships")
      .delete()
      .eq("user_one", u1)
      .eq("user_two", u2);
    setBusy(false);
    setStatus("none");
  }

  if (status === "loading") return null;

  if (status === "friends") {
    return (
      <button
        onClick={removeFriend}
        disabled={busy}
        className="rounded-full border border-paper/20 px-4 py-2 text-sm font-semibold text-paper transition hover:border-sakura disabled:opacity-50"
      >
        ✓ Друзья
      </button>
    );
  }

  if (status === "sent") {
    return (
      <button
        onClick={cancelRequest}
        disabled={busy}
        className="rounded-full border border-paper/20 px-4 py-2 text-sm font-semibold text-muted transition hover:border-sakura hover:text-paper disabled:opacity-50"
      >
        Заявка отправлена ✕
      </button>
    );
  }

  if (status === "received") {
    return (
      <div className="flex gap-2">
        <button
          onClick={acceptRequest}
          disabled={busy}
          className="rounded-full bg-sakura px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
        >
          Принять
        </button>
        <button
          onClick={declineRequest}
          disabled={busy}
          className="rounded-full border border-paper/20 px-4 py-2 text-sm font-semibold text-paper transition hover:border-sakura disabled:opacity-50"
        >
          Отклонить
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={sendRequest}
      disabled={busy}
      className="rounded-full bg-sakura px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
    >
      + Добавить в друзья
    </button>
  );
}
