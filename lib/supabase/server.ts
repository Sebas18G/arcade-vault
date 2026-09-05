import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: { schema: "arcade-vault" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        // El segundo argumento (`headers`) trae las cabeceras anti-caché que
        // deben acompañar a las cookies de sesión. Aquí se ignora a propósito:
        // el cookie store de next/headers escribe cookies pero no cabeceras, y
        // no hay objeto de respuesta al que llegar. Quien las pone es proxy.ts
        // en las rutas protegidas y app/auth/callback/route.ts en el retorno de
        // OAuth, que son los dos puntos donde el servidor escribe sesión.
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Llamado desde un Server Component, donde las cookies ya no se
            // pueden escribir: proxy.ts es el encargado de refrescarlas.
          }
        },
      },
    },
  );
}
