import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/dbConnect";
import Items from "../../../lib/models/Items";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

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
        title,
      } = req.body;
      if (!id || !name || price == null)
        return res.status(400).json({ error: "id, name, price required" });
      const exists = await Items.findOne({ id });
      if (exists) return res.status(400).json({ error: "Item id exists" });
      const it = await Items.create({
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
        title,
      });
      return res.status(201).json(it);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  } else if (req.method === "GET") {
    try {
      const list = await Items.find({}).lean();
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
