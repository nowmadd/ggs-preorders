import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/store/db/connect";
import Items from "@/lib/models/Items";
import Games, { IGame } from "@/lib/models/Games";

type GameSnap = { id: string; game_title: string; game_image?: string };

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
  const g = await Games.findOne({ id }).lean<IGame>();
  if (!g) return undefined;
  return { id: g.id, game_title: g.game_title, game_image: g.game_image };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  const { id } = req.query as { id: string };

  if (req.method === "GET") {
    try {
      const doc: any = await Items.findOne({ id }).lean();
      if (!doc) return res.status(404).json({ error: "Not found" });

      if (!doc?.game?.game_title && doc?.game?.id) {
        const g = await Games.findOne({ id: doc.game.id }).lean<IGame>();
        if (g)
          doc.game = {
            id: g.id,
            game_title: g.game_title,
            game_image: g.game_image,
          };
      }

      return res.status(200).json(doc);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const payload = { ...(req.body || {}) };

      if ("game" in payload || "gameId" in payload) {
        const snap = await toGameSnap(payload.game ?? payload.gameId);
        if (snap) payload.game = snap;
        delete (payload as any).gameId;
      }

      const updated = await Items.findOneAndUpdate({ id }, payload, {
        new: true,
      }).lean();
      if (!updated) return res.status(404).json({ error: "Not found" });
      return res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const deleted = await Items.findOneAndDelete({ id }).lean();
      if (!deleted) return res.status(404).json({ error: "Not found" });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  res.setHeader("Allow", "GET, PUT, PATCH, DELETE");
  return res.status(405).end("Method Not Allowed");
}
