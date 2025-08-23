import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/store/db/connect";
import Items from "@/lib/models/Items";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  await dbConnect();
  const doc = await Items.findOne({ id: ctx.params.id }).lean();
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc, { status: 200 });
}

export async function DELETE(_req: Request, ctx: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  await dbConnect();
  await Items.deleteOne({ id: ctx.params.id });
  return NextResponse.json({ ok: true }, { status: 200 });
}