const DEFAULT_NEXT = "/games";
/**
 * Solo se admite una ruta relativa de un único slash. Una URL absoluta
 * ("https://evil.example") o protocol-relative ("//evil.example") saldría del
 * sitio justo después de un login legítimo, que es el momento de mayor
 * confianza del usuario. Un `next` inválido se trata como ausente, sin error:
 * quien llega con uno manipulado es la víctima, no el atacante.
 *
 * Comparar el prefijo contra la cadena cruda no alcanza, porque el navegador
 * normaliza la URL antes de resolverla (WHATWG URL, esquemas especiales):
 *
 * - TAB, LF y CR se eliminan por completo, así que "/\t/evil.example" termina
 *   navegando a "//evil.example".
 * - "\" se trata como "/", así que "/\evil.example" es también protocol-relative.
 *
 * Por eso se limpian esos caracteres primero y después se rechaza cualquier
 * ruta cuyo segundo carácter sea un separador, sea "/" o "\".
 */
export function safeNext(raw: string | null): string {
  if (!raw) return DEFAULT_NEXT;
  const path = raw.replace(/[\t\n\r]/g, "");
  if (!path.startsWith("/")) return DEFAULT_NEXT;
  if (path[1] === "/" || path[1] === "\\") return DEFAULT_NEXT;
  return path;
}
