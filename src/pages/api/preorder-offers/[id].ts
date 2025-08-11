import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/dbConnect";
import Offers from "../../../lib/models/PreorderOffers";
import PreorderOfferItems from "../../../lib/models/PreorderOfferItems";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      // join offer -> links -> items (by business id)
      const data = await Offers.aggregate([
        { $match: { id: String(id) } },
        {
          $lookup: {
            from: "preorderofferitems",
            localField: "id",
            foreignField: "offer_id",
            as: "links",
          },
        },
        { $addFields: { item_ids: "$links.item_id" } },
        {
          $lookup: {
            from: "items",
            localField: "item_ids",
            foreignField: "id", // business id on items collection
            as: "items",
          },
        },
        { $unset: ["links", "item_ids"] },
      ]);

      if (!data.length)
        return res.status(404).json({ error: "Offer not found" });
      return res.status(200).json(data[0]);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "DELETE") {
    try {
      const removed = await Offers.findOneAndDelete({ id: String(id) });
      if (!removed) return res.status(404).json({ error: "Offer not found" });
      await PreorderOfferItems.deleteMany({ offer_id: String(id) });
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  }

  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).end("Method Not Allowed");
}
