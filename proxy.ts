import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
// En Next 16 la convención `middleware.ts` quedó deprecada y se renombró a
// `proxy.ts` (mismo comportamiento, mismo `config.matcher`). El contenido es el
// patrón oficial de @supabase/ssr: crear el cliente de servidor con el
// adaptador de cookies de request/response, refrescar la sesión y devolver la
// respuesta con las cookies actualizadas.
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  // Segundo argumento de setAll: cabeceras que @supabase/ssr exige poner en
  // toda respuesta que escriba cookies de sesión (`Cache-Control: private,
  // no-store`, `Expires: 0`, `Pragma: no-cache`). Sin ellas, un CDN o proxy
  // inverso puede cachear la respuesta y servirle a otro usuario el token de
  // sesión de este. Se guardan aparte porque el redirect de abajo es otra
  // respuesta y también tiene que llevarlas.
  let authHeaders: Record<string, string> = {};
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: { schema: "arcade-vault" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          authHeaders = headers;
          Object.entries(headers).forEach(([name, value]) =>
            supabaseResponse.headers.set(name, value),
          );
        },
      },
    },
  );
  // No insertar lógica entre createServerClient y esta llamada: el refresco de
  // la sesión depende de que ocurra de inmediato.
  //
  // getClaims() en vez de getUser(): valida el JWT localmente (WebCrypto) con
  // el JWKS cacheado a nivel de proceso, así que el portero no paga un viaje de
  // red al servidor de Auth en cada request protegida. Si el proyecto firmara
  // con secreto simétrico, internamente cae al mismo chequeo remoto que hacía
  // getUser(), o sea que nunca es menos seguro. requirePlayer() sigue usando
  // getUser() al renderizar la ruta: ahí sí hace falta el objeto de usuario.
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth";
    url.search = "";
    url.searchParams.set("next", request.nextUrl.pathname);
    const redirect = NextResponse.redirect(url);
    // Arrastrar lo que setAll haya escrito (típicamente el borrado de una
    // sesión que ya no se pudo refrescar): al devolver una respuesta distinta
    // de supabaseResponse, esas cookies se perderían y el navegador seguiría
    // mandando el token muerto en cada request.
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => redirect.cookies.set(cookie));
    Object.entries(authHeaders).forEach(([name, value]) =>
      redirect.headers.set(name, value),
    );
    return redirect;
  }
  return supabaseResponse;
}
export const config = {
  // Solo las rutas que generan datos. Home, Acerca de, catálogo y ficha de
  // juego siguen públicas.
  matcher: ["/salon", "/salon/:path*", "/games/:id/play"],
};
