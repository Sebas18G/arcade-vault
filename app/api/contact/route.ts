import { NextResponse } from "next/server";
import { Resend } from "resend";

type ContactRequest = {
  name: string;
  email: string;
  msg: string;
};

type ContactResponse = { ok: true } | { ok: false; error: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ContactRequest>;
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const msg = body.msg?.trim() ?? "";

  if (!name || !msg || !EMAIL_REGEX.test(email)) {
    return NextResponse.json<ContactResponse>(
      { ok: false, error: "Datos inválidos." },
      { status: 400 }
    );
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
      return NextResponse.json<ContactResponse>(
        { ok: false, error: error.message },
        { status: 502 }
      );
    }

    return NextResponse.json<ContactResponse>({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido al enviar el correo.";
    return NextResponse.json<ContactResponse>({ ok: false, error: message }, { status: 500 });
  }
}
