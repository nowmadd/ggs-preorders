import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/store/db/connect";
import Items from "@/lib/models/Items";
import Games, { IGame } from "@/lib/models/Games";

type GameSnap = { id: string; game_title: string; game_image?: string };

function hasGameSnap(doc: any) {
  return !!(doc?.game && doc.game.id && doc.game.game_title);
}

async function toGameSnap(gameOrId?: any): Promise<GameSnap | undefined> {
  if (!gameOrId) return undefined;

  // already a snapshot from client
  if (typeof gameOrId === "object" && gameOrId.id && gameOrId.game_title) {
    return {
      id: String(gameOrId.id),
      game_title: String(gameOrId.game_title),
      game_image: gameOrId.game_image ? String(gameOrId.game_image) : undefined,
    };
  }

  // resolve by id
  const id = String(gameOrId);
  const g = await Games.findOne({ id }).lean<IGame>();
  if (!g) return undefined;
  return { id: g.id, game_title: g.game_title, game_image: g.game_image };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const items = await Items.find({}).lean();
      const docs = items as any[];

      // find items that have a game.id but missing a proper snapshot
      const toHydrate = docs.filter(
        (doc) => doc?.game?.id && !hasGameSnap(doc)
      );
      const missingIds = Array.from(
        new Set(toHydrate.map((doc) => String(doc.game.id)))
      );

      if (missingIds.length) {
        const games = await Games.find({ id: { $in: missingIds } }).lean<
          IGame[]
        >();
        const map = new Map(
          games.map((g) => [
            g.id,
            { id: g.id, game_title: g.game_title, game_image: g.game_image },
          ])
        );
        for (const doc of toHydrate) {
          const snap = map.get(doc.game.id);
          if (snap) doc.game = snap;
        }
      }

      return res.status(200).json(docs);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "POST") {
    try {
      const {
        id,
        name,
        description,
        price,
        dp,
        discount,
        category,
        releaseDate,
        image,
        images,
        game,
        gameId,
      } = req.body || {};

      if (!id || !name || price == null || dp == null) {
        return res
          .status(400)
          .json({ error: "id, name, price, dp are required" });
      }

      const gameSnap = await toGameSnap(game ?? gameId);

      const created = await Items.create({
        id,
        name,
        description,
        price,
        dp,
        discount,
        category,
        releaseDate,
        image,
        images,
        game: gameSnap,
      });

      return res.status(201).json(created);
    } catch (err: any) {
      console.error(err);
      if (err?.code === 11000) {
        return res.status(409).json({ error: "Item id already exists" });
      }
      return res.status(500).json({ error: "Server error" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).end("Method Not Allowed");
}
