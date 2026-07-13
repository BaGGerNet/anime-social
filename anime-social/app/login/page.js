"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/profile");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-3xl text-sakura">
          CIRCLE
        </Link>
        <h1 className="mt-6 text-2xl font-semibold text-paper">
          С возвращением
        </h1>
        <p className="mt-1 text-sm text-muted">Войди в свой аккаунт</p>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted">Пароль</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-paper/10 bg-panel px-4 py-3 text-paper outline-none focus:border-sakura"
              placeholder="••••••••"
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
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Нет аккаунта?{" "}
          <Link href="/signup" className="text-denki hover:underline">
            Зарегистрироваться
          </Link>
        </p>
      </div>
    </main>
  );
}
