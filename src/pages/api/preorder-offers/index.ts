import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "../../../lib/dbConnect";
import Offers from "../../../lib/models/PreorderOffers";
import PreorderOfferItems from "../../../lib/models/PreorderOfferItems";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  if (req.method === "POST") {
    try {
      const {
        id,
        title,
        description,
        start_date,
        end_date,
        active = true,
        banner,
        item_ids = [],
      } = req.body;

      if (!id || !title || !start_date || !end_date) {
        return res
          .status(400)
          .json({ error: "id, title, start_date, end_date are required" });
      }
      if (!Array.isArray(item_ids))
        return res.status(400).json({ error: "item_ids must be an array" });

      // 1) create offer
      const offer = await Offers.create({
        id,
        title: title.trim(),
        description: description?.trim(),
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        active: !!active,
        banner,
      });

      // 2) create links
      const links = [...new Set(item_ids)]
        .filter((s: string) => typeof s === "string" && s.trim())
        .map((item_id: string, idx: number) => ({
          offer_id: id,
          item_id,
          sort: idx,
        }));

      if (links.length)
        await PreorderOfferItems.insertMany(links, { ordered: false });

      return res.status(201).json({ ok: true, offer });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  }

  if (req.method === "GET") {
    try {
      const offers = await Offers.find({}).lean();
      return res.status(200).json(offers);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Server error" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).end("Method Not Allowed");
}
