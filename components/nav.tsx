"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
export function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const isActive = (
    name: "home" | "biblioteca" | "salon" | "about" | "auth",
  ) => {
    if (name === "home") return pathname === "/";
    if (name === "biblioteca")
      return pathname === "/games" || pathname.startsWith("/games/");
    if (name === "salon") return pathname === "/salon";
    if (name === "about") return pathname === "/about";
    return pathname === "/auth";
  };
  const close = () => setOpen(false);
  const handleSignOut = async () => {
    await logout();
    router.push("/");
    router.refresh();
  };
  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo">
          <div className="logo-mark"></div>
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>
        <div className="links">
          <Link href="/" className={isActive("home") ? "active" : ""}>
            Inicio
          </Link>
          <Link
            href="/games"
            className={isActive("biblioteca") ? "active" : ""}
          >
            Biblioteca
          </Link>
          <Link href="/salon" className={isActive("salon") ? "active" : ""}>
            Salón de la Fama
          </Link>
          <Link href="/about" className={isActive("about") ? "active" : ""}>
            Acerca de
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="coin-counter">
          <span className="coin"></span>
          <span>CRÉDITOS · 03</span>
        </div>
        {user ? (
          <button className="btn ghost auth-btn" onClick={handleSignOut}>
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}
        <button
          className="btn ghost hamburger"
          onClick={() => setOpen(true)}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>
      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={close}
      ></div>
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link
          href="/"
          className={isActive("home") ? "active" : ""}
          onClick={close}
        >
          Inicio
        </Link>
        <Link
          href="/games"
          className={isActive("biblioteca") ? "active" : ""}
          onClick={close}
        >
          Biblioteca
        </Link>
        <Link
          href="/salon"
          className={isActive("salon") ? "active" : ""}
          onClick={close}
        >
          Salón de la Fama
        </Link>
        <Link
          href="/about"
          className={isActive("about") ? "active" : ""}
          onClick={close}
        >
          Acerca de
        </Link>
        {!user && (
          <Link
            href="/auth"
            className={isActive("auth") ? "active" : ""}
            onClick={close}
          >
            Iniciar Sesión
          </Link>
        )}
        <div style={{ flex: 1 }}></div>
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}
