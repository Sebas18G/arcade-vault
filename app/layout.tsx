import type { Metadata } from "next";
import {
  Press_Start_2P,
  JetBrains_Mono,
  Courier_Prime,
} from "next/font/google";
import { AuthProvider, type UserSession } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import "./globals.css";
const pixelFont = Press_Start_2P({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
});
const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});
const courierPrime = Courier_Prime({
  weight: ["400", "700"],
  variable: "--font-courier-prime",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "Arcade Vault · Portal Retro",
  description:
    "Plataforma para jugar minijuegos arcade online y competir por puntuación.",
};
// La barra de navegación necesita saber quién está dentro desde el primer
// pintado. Resolverlo aquí (servidor, con las cookies ya validadas por
// getUser()) evita que el navegador tenga que averiguarlo al montar.
async function getInitialUser(): Promise<UserSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  // Con sesión pero sin alias todavía (OAuth recién estrenado): /auth/alias lo
  // resuelve, y hasta entonces la barra se comporta como si no hubiera sesión.
  return profile ? { id: user.id, name: profile.username } : null;
}
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const initialUser = await getInitialUser();
  return (
    <html
      lang="es"
      className={`${pixelFont.variable} ${jetbrainsMono.variable} ${courierPrime.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="av-bg" />
        <div className="av-noise" />
        <div className="av-root">
          <AuthProvider initialUser={initialUser}>
            <Nav />
            <main className="av-main">{children}</main>
            <footer
              style={{
                borderTop: "1px solid var(--line)",
                padding: "20px 32px",
                textAlign: "center",
                color: "var(--ink-faint)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.16em",
              }}
            >
              © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
            </footer>
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
