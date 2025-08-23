import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/store/db/connect";
import Games from "@/lib/models/Games";

export async function GET() {
  await dbConnect();
  const list = await Games.find({}).lean();
  return NextResponse.json(list, { status: 200 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  await dbConnect();
  try {
    const body = await req.json().catch(() => ({}));
    const created = await Games.create(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "Game id already exists" }, { status: 409 });
    }
    console.error("GAMES_POST_ERROR", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}