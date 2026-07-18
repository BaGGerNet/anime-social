"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

// Бесплатные публичные STUN-серверы Google — помогают браузерам найти
// друг друга напрямую. Без платного TURN-сервера некоторые люди за
// строгими сетями (корпоративными/учебными) не смогут подключиться —
// это ограничение бесплатного подхода.
const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function VoiceChat({ roomId, userId, username, isOwner }) {
  const [participants, setParticipants] = useState({});
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);

  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const audioElsRef = useRef({});

  const createPeerConnection = useCallback(
    (peerId) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "signal",
            payload: {
              from: userId,
              to: peerId,
              kind: "candidate",
              data: event.candidate,
            },
          });
        }
      };

      pc.ontrack = (event) => {
        let audioEl = audioElsRef.current[peerId];
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          // Добавляем элемент в документ (скрыто) — некоторые браузеры
          // надёжно воспроизводят звук только если элемент реально в DOM
          audioEl.style.display = "none";
          document.body.appendChild(audioEl);
          audioElsRef.current[peerId] = audioEl;
        }
        audioEl.srcObject = event.streams[0];

        const playPromise = audioEl.play();
        if (playPromise) {
          playPromise.catch(() => {
            // Браузер заблокировал автовоспроизведение — покажем кнопку
            setNeedsAudioUnlock(true);
          });
        }
      };

      peersRef.current[peerId] = pc;
      return pc;
    },
    [userId]
  );

  async function initiateOfferTo(peerId) {
    const pc = createPeerConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    channelRef.current.send({
      type: "broadcast",
      event: "signal",
      payload: { from: userId, to: peerId, kind: "offer", data: offer },
    });
  }

  function cleanupPeer(peerId) {
    const pc = peersRef.current[peerId];
    if (pc) {
      pc.close();
      delete peersRef.current[peerId];
    }
    const audioEl = audioElsRef.current[peerId];
    if (audioEl) {
      audioEl.srcObject = null;
      audioEl.remove();
      delete audioElsRef.current[peerId];
    }
  }

  function leaveVoice() {
    Object.keys(peersRef.current).forEach(cleanupPeer);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (channelRef.current) {
      channelRef.current.untrack();
    }
    setJoined(false);
    setMuted(false);
  }

  useEffect(() => {
    const channel = supabase.channel(`voice_${roomId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const map = {};
        Object.keys(state).forEach((key) => {
          const presences = state[key];
          if (presences && presences[0]) {
            map[key] = { username: presences[0].username };
          }
        });
        setParticipants(map);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        if (key === userId) return;
        if (localStreamRef.current) {
          initiateOfferTo(key);
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        cleanupPeer(key);
      })
      .on("broadcast", { event: "signal" }, async ({ payload }) => {
        if (payload.to !== userId) return;
        const { from, kind, data } = payload;

        if (kind === "offer") {
          const pc = createPeerConnection(from);
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({
            type: "broadcast",
            event: "signal",
            payload: { from: userId, to: from, kind: "answer", data: answer },
          });
        } else if (kind === "answer") {
          const pc = peersRef.current[from];
          if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data));
        } else if (kind === "candidate") {
          const pc = peersRef.current[from];
          if (pc) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(data));
            } catch (e) {
              // Кандидат может прийти с опозданием — это нормально, игнорируем
            }
          }
        }
      })
      .subscribe();

    return () => {
      leaveVoice();
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  async function handleJoinVoice() {
    setConnecting(true);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      localStreamRef.current = stream;
      await channelRef.current.track({ username });
      setJoined(true);
    } catch (e) {
      setError("Не удалось получить доступ к микрофону");
    }
    setConnecting(false);
  }

  function unlockAudio() {
    Object.values(audioElsRef.current).forEach((audioEl) => {
      audioEl.play().catch(() => {});
    });
    setNeedsAudioUnlock(false);
  }

  function toggleMute() {
    if (!localStreamRef.current) return;
    const newMuted = !muted;
    localStreamRef.current.getAudioTracks().forEach((t) => {
      t.enabled = !newMuted;
    });
    setMuted(newMuted);
  }

  const participantCount = Object.keys(participants).length;
  const voiceActive = participantCount > 0;

  return (
    <div className="border-b border-paper/10 bg-panel/40 px-6 py-3">
      {error && <p className="mb-2 text-xs text-sakura">{error}</p>}

      {needsAudioUnlock && (
        <button
          onClick={unlockAudio}
          className="mb-2 rounded-full bg-denki px-4 py-2 text-xs font-semibold text-paper"
        >
          🔊 Включить звук
        </button>
      )}

      {!joined ? (
        voiceActive ? (
          <button
            onClick={handleJoinVoice}
            disabled={connecting}
            className="rounded-full bg-sakura px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {connecting
              ? "Подключаемся..."
              : `🎤 Присоединиться к голосовому чату (${participantCount})`}
          </button>
        ) : isOwner ? (
          <button
            onClick={handleJoinVoice}
            disabled={connecting}
            className="rounded-full bg-sakura px-4 py-2 text-sm font-semibold text-ink transition hover:brightness-110 disabled:opacity-50"
          >
            {connecting ? "Запускаем..." : "🎤 Начать голосовой чат"}
          </button>
        ) : (
          <p className="text-xs text-muted">Голосовой чат ещё не начат</p>
        )
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(participants).map(([id, p]) => (
              <span
                key={id}
                className="rounded-full bg-ink px-3 py-1 text-xs text-paper"
              >
                🎤 {p.username}
                {id === userId && " (вы)"}
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={toggleMute}
              className="rounded-full border border-paper/20 px-4 py-2 text-xs font-semibold text-paper transition hover:border-sakura"
            >
              {muted ? "Включить микрофон" : "Заглушить"}
            </button>
            <button
              onClick={leaveVoice}
              className="rounded-full border border-sakura px-4 py-2 text-xs font-semibold text-sakura transition hover:bg-sakura hover:text-ink"
            >
              Покинуть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
