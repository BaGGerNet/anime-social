import Link from "next/link";
import LogoMark from "../components/LogoMark";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-ink">
      <div className="halftone-bg absolute inset-0 opacity-60" />

      <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center">
        <LogoMark size={72} />

        <span className="mb-4 mt-6 rounded-full border border-sakura/40 px-4 py-1 text-sm tracking-wide text-sakura">
          сезон открыт · заходи
        </span>

        <h1 className="font-display text-6xl leading-none tracking-wide text-paper sm:text-8xl">
          ANIWaku
        </h1>
        <p className="mt-2 font-display text-2xl tracking-widest text-sakura sm:text-3xl">
          твой круг общения
        </p>

        <p className="mt-8 max-w-xl text-lg text-muted">
          Обсуждай тайтлы, находи людей с похожим вкусом и веди список
          просмотренного — всё в одном месте, без спойлеров от тех, кто
          насмотрелся на сезон вперёд.
        </p>

        <div className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/signup"
            className="rounded-full bg-sakura px-8 py-3 text-center font-semibold text-ink transition hover:brightness-110"
          >
            Присоединиться
          </Link>
          <Link
            href="/login"
            className="whitespace-nowrap rounded-full border border-paper/30 px-8 py-3 text-center font-semibold text-paper transition hover:border-paper"
          >
            У меня уже есть аккаунт
          </Link>
        </div>

        <div className="mt-20 flex max-w-2xl flex-wrap justify-center gap-4">
          {[
            "«Кто ещё смотрит Frieren?»",
            "«Го обсудим новую арку»",
            "«Ищу тиммейтов по вайбу сейнена»",
          ].map((text) => (
            <div
              key={text}
              className="speech-bubble bg-panel px-5 py-3 text-sm text-paper/90 shadow-lg"
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
