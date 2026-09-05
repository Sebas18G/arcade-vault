import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
// En Next 16 la convención `middleware.ts` quedó deprecada y se renombró a
// `proxy.ts` (mismo comportamiento, mismo `config.matcher`). El contenido es el
// patrón oficial de @supabase/ssr: crear el cliente de servidor con el
// adaptador de cookies de request/response, llamar a getUser() y devolver la
// respuesta con las cookies de sesión refrescadas.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: { schema: "arcade-vault" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  // No insertar lógica entre createServerClient y getUser(): el refresco de la
  // sesión depende de que esta llamada ocurra de inmediato.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return supabaseResponse;
}
export const config = {
  // Solo las rutas que generan datos. Home, Acerca de, catálogo y ficha de
  // juego siguen públicas.
  matcher: ["/salon", "/salon/:path*", "/games/:id/play"],
};
