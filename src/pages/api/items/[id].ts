import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/dbConnect";
import Items from "../../../lib/models/Items";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    const it = await Items.findOne({ id: String(id) }).lean();
    if (!it) return res.status(404).json({ error: "Item not found" });
    return res.status(200).json(it);
  } else if (req.method === "PATCH") {
    const updated = await Items.findOneAndUpdate(
      { id: String(id) },
      { $set: req.body },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Item not found" });
    return res.status(200).json(updated);
  } else if (req.method === "DELETE") {
    await Items.deleteOne({ id: String(id) });
    return res.status(200).json({ message: "Deleted" });
  } else {
    res.setHeader("Allow", "GET, PATCH, DELETE");
    return res.status(405).end("Method Not Allowed");
  }
}
