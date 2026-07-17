"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function ProfileRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      router.replace(`/profile/${user.id}`);
    }

    redirect();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink">
      <p className="text-muted">Загружаем профиль...</p>
    </main>
  );
}
