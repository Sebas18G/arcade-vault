import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
// exchangeCodeForSession escribe las cookies de sesión en esta respuesta a
// través del cookie store de next/headers, que no puede tocar cabeceras. Se
// ponen aquí a mano: una respuesta con Set-Cookie de sesión no puede quedar
// cacheada en un CDN o proxy inverso, o le entregaría la sesión a otro usuario.
const NO_STORE = {
  "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
  Expires: "0",
  Pragma: "no-cache",
};
function redirect(url: string | URL) {
  return NextResponse.redirect(url, { headers: NO_STORE });
}
// Retorno de OAuth (Google / GitHub): cambia el código por una sesión y decide
// a dónde mandar al jugador según tenga o no alias en "arcade-vault".profiles.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  if (!code) {
    return redirect(`${origin}/auth?error=oauth`);
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return redirect(`${origin}/auth?error=oauth`);
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile) {
    const aliasUrl = new URL("/auth/alias", origin);
    aliasUrl.searchParams.set("next", next);
    return redirect(aliasUrl);
  }
  return redirect(new URL(next, origin));
}
