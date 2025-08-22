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
      const mine = req.query.mine === "1" || req.query.mine === "true";

      // Require auth for any listing
      if (!session?.user?.id) {
        return res.status(401).json({ error: "Sign in required" });
      }

      if (mine) {
        // Only return THIS user’s preorders
        const list = await Preorders.find(
          { customer_id: session.user.id },
          { _id: 0 }
        )
          .sort({ created_at: -1 })
          .lean();
        return res.status(200).json(list);
      }

      // Non-`mine` listing is ADMIN only
      if (session.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden" });
      }

      const list = await Preorders.find({}, { _id: 0 })
        .sort({ created_at: -1 })
        .lean();
      return res.status(200).json(list);
    } catch (err) {
      console.error("PREORDERS_LIST_ERROR", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "POST") {
    try {
      const session = await getServerSession(req, res, authOptions);
      if (!session?.user?.id) {
        return res.status(401).json({ error: "Sign in required" });
      }

      const { offer_id, expected_release, items, totals } = req.body || {};

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "At least one item is required" });
      }

      const preorderId = `PO-${Date.now()}`;

      await Preorders.create({
        id: preorderId,
        customer_id: session.user.id,
        offer_id: offer_id || null,
        status: "pending",
        payment_status: "unpaid",
        shipping_status: "not_shipped",
        expected_release: expected_release || null,
        totals: {
          price: Number(totals?.price || 0),
          downpayment: Number(totals?.downpayment || 0),
        },
        items: items.map((it: any) => ({
          item_id: it.item_id,
          quantity: Number(it.quantity || 0),
          snapshot: it.snapshot || undefined,
          pricing: it.pricing || undefined,
        })),
        created_at: new Date(),
      });

      return res
        .status(201)
        .json({ message: "Preorder created", preorder_id: preorderId });
    } catch (err) {
      console.error("PREORDERS_CREATE_ERROR", err);
      return res.status(500).json({ error: "Server error" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).end("Method Not Allowed");
}
