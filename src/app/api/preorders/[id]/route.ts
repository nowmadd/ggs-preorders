import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/store/db/connect";
import Preorders from "@/lib/models/Preorders";

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  await dbConnect();
  try {
    const session = await getServerSession(authOptions);
    const id = ctx.params.id;
    const doc = await Preorders.findOne({ id }, { _id: 0 }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isOwner = !!session?.user?.id && doc.customer_id === session.user.id;
    const isAdmin = (session as any)?.user?.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(doc, { status: 200 });
  } catch (err) {
    console.error("PREORDERS_GET_ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}