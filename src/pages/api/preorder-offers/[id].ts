import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/store/db/connect";
import PreorderOffers, {
  type IPreorderOffer,
} from "@/lib/models/PreorderOffers";
import PreorderOfferItems from "@/lib/models/PreorderOfferItems";
import Items from "@/lib/models/Items";

async function embedItemsForOffer(offer: any) {
  const links = await PreorderOfferItems.find({ offer_id: offer.id })
    .select("item_id sort")
    .lean();
  const ids = links.map((l) => l.item_id);
  if (ids.length === 0) return { ...offer, items: [] };

  const items = await Items.find({ id: { $in: ids } })
    .select(
      "id name price dp discount category releaseDate image logo images title description game"
    )
    .lean();
  const map = new Map(items.map((i) => [i.id, i]));
  const sorted = links.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const resolved = sorted.map((l) => map.get(l.item_id)).filter(Boolean);
  return { ...offer, items: resolved };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  const { method, query } = req;
  const id = String(query.id);

  switch (method) {
    case "GET": {
      try {
        const include = String(query.include || "");
        const offer = await PreorderOffers.findOne({
          id,
        }).lean<IPreorderOffer | null>();
        if (!offer) return res.status(404).json({ error: "Not found" });

        if (include === "items") {
          const withItems = await embedItemsForOffer(offer);
          return res.status(200).json(withItems);
        }
        return res.status(200).json(offer);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
      }
    }

    case "PATCH": {
      try {
        const include = String(query.include || "");
        const {
          title,
          description,
          start_date,
          end_date,
          active,
          banner,
          logo,
          item_ids, // optional: new complete set of linked item ids
        } = req.body || {};

        const $set: Record<string, any> = {};
        if (title !== undefined) $set.title = title;
        if (description !== undefined) $set.description = description;
        if (start_date !== undefined) $set.start_date = start_date;
        if (end_date !== undefined) $set.end_date = end_date;
        if (active !== undefined) $set.active = !!active;
        if (banner !== undefined) $set.banner = banner;
        if (logo !== undefined) $set.logo = logo;

        if (Object.keys($set).length) {
          const updated = await PreorderOffers.findOneAndUpdate(
            { id },
            { $set },
            { new: true }
          ).lean<IPreorderOffer | null>();
          if (!updated) return res.status(404).json({ error: "Not found" });
        } else {
          // ensure it exists
          const exists = await PreorderOffers.findOne({ id }).lean();
          if (!exists) return res.status(404).json({ error: "Not found" });
        }

        // Update join links if provided
        if (Array.isArray(item_ids)) {
          const uniqueNew = Array.from(new Set(item_ids));

          const current = await PreorderOfferItems.find({ offer_id: id })
            .select("item_id")
            .lean();
          const currentSet = new Set(current.map((c) => c.item_id));
          const newSet = new Set(uniqueNew);

          const toAdd = uniqueNew.filter((x) => !currentSet.has(x));
          const toRemove = Array.from(currentSet).filter((x) => !newSet.has(x));

          const ops: any[] = [];
          toAdd.forEach((item_id, idx) => {
            ops.push({
              insertOne: { document: { offer_id: id, item_id, sort: idx } },
            });
          });
          toRemove.forEach((item_id) => {
            ops.push({ deleteOne: { filter: { offer_id: id, item_id } } });
          });
          if (ops.length) {
            try {
              await PreorderOfferItems.bulkWrite(ops, { ordered: false });
            } catch (e: any) {
              if (e?.code !== 11000) throw e;
            }
          }

          // also update sort for remaining items to match new order
          const remaining = uniqueNew.filter((x) => !toAdd.includes(x));
          if (remaining.length) {
            await Promise.all(
              remaining.map((item_id, idx) =>
                PreorderOfferItems.updateOne(
                  { offer_id: id, item_id },
                  { $set: { sort: idx } }
                )
              )
            );
          }
        }

        // Return latest
        const final = await PreorderOffers.findOne({
          id,
        }).lean<IPreorderOffer | null>();
        if (!final) return res.status(404).json({ error: "Not found" });

        if (include === "items") {
          const withItems = await embedItemsForOffer(final);
          return res.status(200).json(withItems);
        }
        return res.status(200).json(final);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
      }
    }

    case "DELETE": {
      try {
        const deleted = await PreorderOffers.findOneAndDelete({ id }).lean();
        if (!deleted) return res.status(404).json({ error: "Not found" });
        await PreorderOfferItems.deleteMany({ offer_id: id });
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
      }
    }

    default: {
      res.setHeader("Allow", "GET, PATCH, DELETE");
      return res.status(405).end("Method Not Allowed");
    }
  }
}
