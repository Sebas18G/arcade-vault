import type { createClient } from "@/lib/supabase/client";
type SupabaseBrowserClient = ReturnType<typeof createClient>;
/**
 * Las tablas de scores solo aceptan INSERT de usuarios autenticados y con
 * user_id = auth.uid() (RLS, spec 12). Cada add*Score() pide el id por aquí y
 * falla temprano —con un mensaje legible— si la sesión se perdió durante la
 * partida, en vez de chocar contra la policy.
 */
export async function requireUserId(
  supabase: SupabaseBrowserClient,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Necesitas iniciar sesión para guardar tu puntuación.");
  }
  return user.id;
}
