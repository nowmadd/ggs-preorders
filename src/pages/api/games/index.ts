import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/dbConnect";
import Games from "../../../lib/models/Games";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method === "POST") {
    try {
      const { game_code, game_title } = req.body;
      if (!game_code || !game_title)
        return res.status(400).json({ error: "game code and title required" });
      const exists = await Games.findOne({ game_code });
      if (exists) return res.status(400).json({ error: "Customer id exists" });
      const c = await Games.create({ game_code, game_title });
      return res.status(201).json(c);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  } else if (req.method === "GET") {
    try {
      const list = await Games.find({}).lean();
      return res.status(200).json(list);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  } else {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).end("Method Not Allowed");
  }
}
