import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/store/db/connect";
import Games from "@/lib/models/Games";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method === "GET") {
    const list = await Games.find({}).lean();
    return res.status(200).json(list);
  }

  if (req.method === "POST") {
    try {
      const { id, game_title, game_image } = req.body || {};
      if (!id || !game_title) {
        return res.status(400).json({ error: "id and game_title required" });
      }
      const exists = await Games.findOne({ id }).lean();
      if (exists) return res.status(409).json({ error: "Game id exists" });

      const doc = await Games.create({ id, game_title, game_image });
      return res.status(201).json(doc);
    } catch (err: any) {
      if (err?.code === 11000) {
        return res.status(409).json({ error: "Duplicate game id" });
      }
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).end("Method Not Allowed");
}
