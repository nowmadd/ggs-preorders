import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/dbConnect";
import Customers from "../../../lib/models/Customers";
import Preorders from "../../../lib/models/Preorders";
import PreorderItems from "../../../lib/models/PreorderOfferItems";
import Items from "../../../lib/models/Items";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method === "POST") {
    try {
      const { customer_id, offer_id, expected_release, items } = req.body;
      if (
        !customer_id ||
        !items ||
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res
          .status(400)
          .json({ error: "customer_id and items are required" });
      }

      const customer = await Customers.findOne({ id: customer_id });
      if (!customer)
        return res.status(400).json({ error: "Customer not found" });

      // validate items and calculate total
      let total = 0;
      const pItems = [];
      for (const it of items) {
        const product = await Items.findOne({ id: it.item_id });
        if (!product)
          return res
            .status(400)
            .json({ error: `Item not found: ${it.item_id}` });
        if (!it.quantity || it.quantity <= 0)
          return res.status(400).json({ error: "Invalid quantity" });
        total += product.price * it.quantity;
        pItems.push({
          item_id: product.id,
          quantity: it.quantity,
          price_each: product.price,
        });
      }

      const preorderId = `PO-${Date.now()}`;
      const preorderDoc = await Preorders.create({
        id: preorderId,
        customer_id,
        offer_id: offer_id || null,
        status: "pending",
        total_amount: total,
        currency: "PHP",
        expected_release: expected_release || null,
        payment_status: "unpaid",
        shipping_status: "not_shipped",
      });

      // insert preorder items
      const toInsert = pItems.map((pi) => ({ ...pi, preorder_id: preorderId }));
      await PreorderItems.insertMany(toInsert);

      return res
        .status(201)
        .json({ message: "Preorder created", preorder_id: preorderId });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Server error" });
    }
  } else if (req.method === "GET") {
    try {
      const list = await Preorders.find({}).lean();
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
