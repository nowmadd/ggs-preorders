import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/store/db/connect";
import Items from "@/lib/models/Items";
import Games, { IGame } from "@/lib/models/Games";

type GameSnap = { id: string; game_title: string; game_image?: string };

function hasGameSnap(doc: any) {
  return !!(doc?.game && doc.game.id && doc.game.game_title);
}

async function toGameSnap(gameOrId?: any): Promise<GameSnap | undefined> {
  if (!gameOrId) return undefined;
  if (typeof gameOrId === "object" && gameOrId.id && gameOrId.game_title) {
    return {
      id: String(gameOrId.id),
      game_title: String(gameOrId.game_title),
      game_image: gameOrId.game_image ? String(gameOrId.game_image) : undefined,
    };
  }
  const id = String(gameOrId);
  const g = await Games.findOne({ id }).lean<IGame | null>();
  if (!g) return undefined;
  return { id: g.id, game_title: g.game_title, game_image: g.game_image };
}

export async function GET() {
  await dbConnect();
  try {
    const docs = (await Items.find({}).lean()) as any[];
    const toHydrate = docs.filter((doc) => doc?.game?.id && !hasGameSnap(doc));
    const missingIds = Array.from(new Set(toHydrate.map((doc) => String(doc.game.id))));
    if (missingIds.length) {
      const games = await Games.find({ id: { $in: missingIds } }).lean<IGame[]>();
      const map = new Map(games.map((g) => [g.id, { id: g.id, game_title: g.game_title, game_image: g.game_image }]));
      for (const doc of toHydrate) {
        const snap = map.get(doc.game.id);
        if (snap) doc.game = snap;
      }
    }
    return NextResponse.json(docs, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  await dbConnect();
  try {
    const body = await req.json().catch(() => ({}));
    const {
      id, name, description, price, dp, discount, category, releaseDate, image, images, game, gameId,
    } = body || {};

    let gameSnap = await toGameSnap(game ?? gameId);
    const created = await Items.create({
      id, name, description, price, dp, discount, category, releaseDate, image, images, game: gameSnap,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error(err);
    if (err?.code === 11000) {
      return NextResponse.json({ error: "Item id already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}