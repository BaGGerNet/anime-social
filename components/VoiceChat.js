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

// Порог громкости, выше которого считаем, что человек говорит (0-255)
const SPEAKING_THRESHOLD = 14;

export default function VoiceChat({ roomId, userId, username, avatarUrl, isOwner }) {
  const [participants, setParticipants] = useState({});
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [speaking, setSpeaking] = useState({});

  const channelRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const audioElsRef = useRef({});
  const audioCtxRef = useRef(null);
  const analysersRef = useRef({});
  const speakingIntervalRef = useRef(null);

  function ensureAudioContext() {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContextClass();
    }
    return audioCtxRef.current;
  }

  function attachAnalyser(id, stream) {
    try {
      const ctx = ensureAudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      source.connect(analyser);
      analysersRef.current[id] = {
        analyser,
        dataArray: new Uint8Array(analyser.frequencyBinCount),
      };
    } catch (e) {
      // Если анализ звука не удался — просто не будет индикатора говорения
    }
  }

  function detachAnalyser(id) {
    delete analysersRef.current[id];
  }

  // Периодически проверяем громкость каждого потока, чтобы понять,
  // кто сейчас говорит
  useEffect(() => {
    speakingIntervalRef.current = setInterval(() => {
      const nextSpeaking = {};
      let changed = false;

      Object.entries(analysersRef.current).forEach(([id, { analyser, dataArray }]) => {
        analyser.getByteFrequencyData(dataArray);
        const avg =
          dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        nextSpeaking[id] = avg > SPEAKING_THRESHOLD;
      });

      setSpeaking((prev) => {
        const keys = new Set([...Object.keys(prev), ...Object.keys(nextSpeaking)]);
        for (const key of keys) {
          if (!!prev[key] !== !!nextSpeaking[key]) {
            changed = true;
            break;
          }
        }
        return changed ? nextSpeaking : prev;
      });
    }, 200);

    return () => clearInterval(speakingIntervalRef.current);
  }, []);

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
          audioEl.style.display = "none";
          document.body.appendChild(audioEl);
          audioElsRef.current[peerId] = audioEl;
        }
        audioEl.srcObject = event.streams[0];
        attachAnalyser(peerId, event.streams[0]);

        const playPromise = audioEl.play();
        if (playPromise) {
          playPromise.catch(() => {
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
    detachAnalyser(peerId);
  }

  function leaveVoice() {
    Object.keys(peersRef.current).forEach(cleanupPeer);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    detachAnalyser(userId);
    if (channelRef.current) {
      channelRef.current.untrack();
    }
    setJoined(false);
    setMuted(false);
    setSpeaking({});
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
            map[key] = {
              username: presences[0].username,
              avatarUrl: presences[0].avatarUrl || "",
            };
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
      attachAnalyser(userId, stream);
      await channelRef.current.track({ username, avatarUrl: avatarUrl || "" });
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
    <div className="border-b border-paper/10 bg-panel/40 px-6 py-4">
      {error && <p className="mb-2 text-center text-xs text-sakura">{error}</p>}

      {needsAudioUnlock && (
        <div className="mb-2 text-center">
          <button
            onClick={unlockAudio}
            className="rounded-full bg-denki px-4 py-2 text-xs font-semibold text-paper"
          >
            🔊 Включить звук
          </button>
        </div>
      )}

      {!joined ? (
        <div className="text-center">
          {voiceActive ? (
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
          )}
        </div>
      ) : (
        <div>
          {/* Аватары участников по центру */}
          <div className="flex flex-wrap items-start justify-center gap-6">
            {Object.entries(participants).map(([id, p]) => {
              const isSpeaking = !!speaking[id];
              return (
                <div key={id} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-panel text-lg font-semibold text-sakura ring-2 transition-all duration-150 ${
                      isSpeaking
                        ? "ring-green-400/70 shadow-[0_0_12px_2px_rgba(74,222,128,0.35)]"
                        : "ring-transparent"
                    }`}
                  >
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      p.username[0]?.toUpperCase()
                    )}
                  </div>
                  <p className="max-w-[70px] truncate text-center text-xs text-paper">
                    {p.username}
                    {id === userId && " (вы)"}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-center gap-2">
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
