// pages/api/preorders/[id].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import dbConnect from "../../../lib/store/db/connect";
import Preorders from "../../../lib/models/Preorders";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.id) {
        return res.status(401).json({ error: "Sign in required" });
      }

      const id = String(req.query.id);
      const doc = await Preorders.findOne({ id }, { _id: 0 }).lean();

      if (!doc) return res.status(404).json({ error: "Not found" });

      const isOwner = doc.customer_id === session.user.id;
      const isAdmin = session.user.role === "admin";
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Forbidden" });
      }

      return res.status(200).json(doc);
    } catch (err) {
      console.error("PREORDERS_GET_ERROR", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  res.setHeader("Allow", "GET");
  return res.status(405).end("Method Not Allowed");
}
