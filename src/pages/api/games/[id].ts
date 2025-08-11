import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/dbConnect";
import Games from "../../../lib/models/Games";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  const { game_code } = req.query;

  if (req.method === "GET") {
    const game = await Games.findOne({ game_code: String(game_code) }).lean();
    if (!game) return res.status(404).json({ error: "Item not found" });
    return res.status(200).json(game);
  } else if (req.method === "PATCH") {
    const updated = await Games.findOneAndUpdate(
      { game_code: String(game_code) },
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Item not found" });
    return res.status(200).json(updated);
  } else if (req.method === "DELETE") {
    await Games.deleteOne({ game_code: String(game_code) });
    return res.status(200).json({ message: "Deleted" });
  } else {
    res.setHeader("Allow", "GET, PATCH, DELETE");
    return res.status(405).end("Method Not Allowed");
  }
}
