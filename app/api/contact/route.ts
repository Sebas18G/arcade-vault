import { NextResponse } from "next/server";
import { Resend } from "resend";
type ContactRequest = {
  name: string;
  email: string;
  msg: string;
};
type ContactResponse = { ok: true } | { ok: false; error: string };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// El formulario es público y sin captcha: sin cotas, un POST directo puede
// mandar megabytes por el canal de correo. Los topes son holgados para el uso
// legítimo del formulario de contacto.
const MAX_NAME = 80;
const MAX_EMAIL = 254;
const MAX_MSG = 4000;
function fail(error: string, status: number) {
  return NextResponse.json<ContactResponse>({ ok: false, error }, { status });
}
export async function POST(request: Request) {
  // request.json() lanza si el cuerpo no es JSON válido; fuera del try eso
  // terminaba en un 500 sin controlar.
  let body: Partial<ContactRequest>;
  try {
    body = (await request.json()) as Partial<ContactRequest>;
  } catch {
    return fail("Datos inválidos.", 400);
  }
  // El nombre viaja en el asunto del correo: los saltos de línea se quitan para
  // que no pueda partirlo en dos.
  const name = (body.name ?? "").replace(/[\r\n]/g, " ").trim();
  const email = (body.email ?? "").trim();
  const msg = (body.msg ?? "").trim();
  if (
    !name ||
    !msg ||
    !EMAIL_REGEX.test(email) ||
    name.length > MAX_NAME ||
    email.length > MAX_EMAIL ||
    msg.length > MAX_MSG
  ) {
    return fail("Datos inválidos.", 400);
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: process.env.CONTACT_TO_EMAIL!,
      replyTo: email,
      subject: `Nuevo mensaje de contacto de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${msg}`,
    });
    if (error) {
      // El mensaje del proveedor se queda en el servidor: llega en inglés y
      // puede describir la configuración de la cuenta de correo.
      console.error("[contact] Resend rechazó el envío:", error);
      return fail("No se pudo enviar el mensaje. Intenta de nuevo.", 502);
    }
    return NextResponse.json<ContactResponse>({ ok: true });
  } catch (err) {
    console.error("[contact] fallo al enviar el correo:", err);
    return fail("No se pudo enviar el mensaje. Intenta de nuevo.", 500);
  }
}
