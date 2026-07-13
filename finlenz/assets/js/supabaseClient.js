import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // WebView do App Inventor tem suporte quebrado à Web Locks API
    // (navigator.locks), o que trava o supabase-js para sempre no login.
    // Forçamos aqui uma "lock" no-op para evitar o travamento.
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
});
