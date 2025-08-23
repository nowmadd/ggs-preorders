// app/api/recaptcha/verify/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ ok: false }, { status: 400 });

    const secret = process.env.RECAPTCHA_SECRET_KEY!;
    const ip = req.headers.get("x-forwarded-for") ?? "";

    const params = new URLSearchParams();
    params.set("secret", secret);
    params.set("response", token);
    if (ip) params.set("remoteip", ip);

    const r = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const data = await r.json();

    // For v2 invisible, success boolean is the key
    if (!data.success) {
      return NextResponse.json({ ok: false, ...data }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
