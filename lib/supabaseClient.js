import { createClient } from "@supabase/supabase-js";

let supabaseInstance = null;

function getSupabaseClient() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true, // сохранять сессию между визитами
        autoRefreshToken: true, // тихо продлевать токен, не выкидывая из аккаунта
        detectSessionInUrl: true,
      },
    });
  }
  return supabaseInstance;
}

// Прокси откладывает реальное создание клиента до первого
// обращения (например, supabase.auth.getUser()), которое
// происходит только в браузере — а не во время сборки на сервере.
export const supabase = new Proxy(
  {},
  {
    get(_target, prop) {
      return getSupabaseClient()[prop];
    },
  }
);
