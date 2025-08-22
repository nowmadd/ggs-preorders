import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/store/db/connect";
import Games from "@/lib/models/Games";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  const { id } = req.query as { id: string };

  if (req.method === "GET") {
    const doc = await Games.findOne({ id }).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(doc);
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const payload = req.body || {};
      const updated = await Games.findOneAndUpdate({ id }, payload, {
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
    const deleted = await Games.findOneAndDelete({ id }).lean();
    if (!deleted) return res.status(404).json({ error: "Not found" });
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, PUT, PATCH, DELETE");
  return res.status(405).end("Method Not Allowed");
}
