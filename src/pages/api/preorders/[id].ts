import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/dbConnect";
import Preorders from "../../../lib/models/Preorders";
import PreorderItems from "../../../lib/models/PreorderOfferItems";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const data = await Preorders.aggregate([
        { $match: { id: String(id) } },
        {
          $lookup: {
            from: "customers",
            localField: "customer_id",
            foreignField: "id",
            as: "customer",
          },
        },
        { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "preorder_items",
            localField: "id",
            foreignField: "preorder_id",
            as: "preorder_items",
          },
        },
        {
          $lookup: {
            from: "items",
            localField: "preorder_items.item_id",
            foreignField: "id",
            as: "items_info",
          },
        },
        {
          $addFields: {
            preorder_items: {
              $map: {
                input: "$preorder_items",
                as: "pi",
                in: {
                  $mergeObjects: [
                    "$$pi",
                    {
                      product: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$items_info",
                              as: "item",
                              cond: { $eq: ["$$item.id", "$$pi.item_id"] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        { $unset: "items_info" },
      ]);

      if (!data || data.length === 0)
        return res.status(404).json({ error: "Preorder not found" });
      return res.status(200).json(data[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  } else if (req.method === "PATCH") {
    try {
      const { status, payment_status, shipping_status } = req.body;
      const update: any = {};
      if (status) update.status = status;
      if (payment_status) update.payment_status = payment_status;
      if (shipping_status) update.shipping_status = shipping_status;

      if (Object.keys(update).length === 0)
        return res.status(400).json({ error: "Nothing to update" });

      const updated = await Preorders.findOneAndUpdate(
        { id: String(id) },
        { $set: update },
        { new: true }
      );
      if (!updated)
        return res.status(404).json({ error: "Preorder not found" });
      return res.status(200).json({ message: "Updated", preorder: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  } else if (req.method === "DELETE") {
    try {
      const preorder = await Preorders.findOne({ id: String(id) });
      if (!preorder)
        return res.status(404).json({ error: "Preorder not found" });
      await PreorderItems.deleteMany({ preorder_id: preorder.id });
      await Preorders.deleteOne({ id: preorder.id });
      return res.status(200).json({ message: "Preorder cancelled" });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  } else {
    res.setHeader("Allow", "GET, PATCH, DELETE");
    return res.status(405).end("Method Not Allowed");
  }
}
