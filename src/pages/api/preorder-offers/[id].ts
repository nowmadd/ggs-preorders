import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/dbConnect";
import PreorderOffer from "@/lib/models/PreorderOffers";
import PreorderOfferItem from "@/lib/models/PreorderOfferItems";
import Item from "@/lib/models/Items";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  const { id } = req.query as { id: string };

  try {
    if (req.method === "GET") {
      const include = String(req.query.include || "");
      const withItems = include.split(",").includes("items");

      if (!withItems) {
        const offer = await PreorderOffer.findOne({ id }).lean();
        if (!offer) return res.status(404).json({ error: "Offer not found" });
        const { _id, ...rest } = offer as any;
        return res.status(200).json(rest);
      }

      // With items (join table)
      const results = await PreorderOffer.aggregate([
        { $match: { id } },
        {
          $lookup: {
            from: PreorderOfferItem.collection.name,
            localField: "id",
            foreignField: "offer_id",
            as: "links",
          },
        },
        {
          $lookup: {
            from: Item.collection.name,
            localField: "links.item_id",
            foreignField: "id",
            as: "items",
          },
        },
        {
          $project: {
            _id: 0,
            id: 1,
            title: 1,
            description: 1,
            start_date: 1,
            end_date: 1,
            active: 1,
            banner: 1,
            created_at: 1,
            items: {
              $map: {
                input: "$items",
                as: "it",
                in: {
                  id: "$$it.id",
                  name: "$$it.name",
                  price: "$$it.price",
                  dp: "$$it.dp",
                  image: "$$it.image",
                },
              },
            },
          },
        },
        { $limit: 1 },
      ]);

      if (!results.length)
        return res.status(404).json({ error: "Offer not found" });
      return res.status(200).json(results[0]);
    }

    res.setHeader("Allow", "GET");
    return res.status(405).end("Method Not Allowed");
  } catch (err) {
    console.error("PREORDER_OFFER_ID_ERROR", err);
    return res.status(500).json({ error: "Server error" });
  }
}
