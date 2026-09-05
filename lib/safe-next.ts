const DEFAULT_NEXT = "/games";
/**
 * Solo se admite una ruta relativa de un único slash. Una URL absoluta
 * ("https://evil.example") o protocol-relative ("//evil.example") saldría del
 * sitio justo después de un login legítimo, que es el momento de mayor
 * confianza del usuario. Un `next` inválido se trata como ausente, sin error:
 * quien llega con uno manipulado es la víctima, no el atacante.
 */
export function safeNext(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//")
    ? raw
    : DEFAULT_NEXT;
}
