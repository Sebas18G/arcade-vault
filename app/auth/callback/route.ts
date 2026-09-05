import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
// Retorno de OAuth (Google / GitHub): cambia el código por una sesión y decide
// a dónde mandar al jugador según tenga o no alias en "arcade-vault".profiles.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/games";
  if (!code) {
    return NextResponse.redirect(`${origin}/auth?error=oauth`);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/auth?error=oauth`);
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) {
    const aliasUrl = new URL("/auth/alias", origin);
    aliasUrl.searchParams.set("next", next);
    return NextResponse.redirect(aliasUrl);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
