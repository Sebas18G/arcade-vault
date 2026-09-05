import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
/**
 * Segunda capa de bloqueo, además del matcher de proxy.ts: se llama desde el
 * Server Component de cada ruta protegida, así un matcher mal escrito no deja
 * la ruta abierta en silencio. Sin sesión manda a /auth?next=…; con sesión pero
 * sin alias en profiles, a /auth/alias.
 */
export async function requirePlayer(nextPath: string): Promise<{
  id: string;
  username: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth?next=${encodeURIComponent(nextPath)}`);
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) {
    redirect(`/auth/alias?next=${encodeURIComponent(nextPath)}`);
  }
  return { id: profile.id, username: profile.username };
}
