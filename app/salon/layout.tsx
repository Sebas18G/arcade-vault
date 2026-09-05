import type { ReactNode } from "react";
import { requirePlayer } from "@/lib/auth-guard";
// app/salon/page.tsx es "use client" y no puede validar la sesión en servidor:
// este layout es quien cubre el Salón cuando el matcher de proxy.ts no aplica.
export default async function SalonLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requirePlayer("/salon");
  return <>{children}</>;
}
