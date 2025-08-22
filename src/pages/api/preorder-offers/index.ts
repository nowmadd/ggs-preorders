import type { NextApiRequest, NextApiResponse } from "next";
import dbConnect from "@/lib/store/db/connect";
import PreorderOffers, {
  type IPreorderOffer,
} from "@/lib/models/PreorderOffers";
import PreorderOfferItems from "@/lib/models/PreorderOfferItems";
import Items from "@/lib/models/Items";

async function embedItems(list: any[]) {
  const offerIds = list.map((o) => o.id);
  if (offerIds.length === 0) return list;

  const links = await PreorderOfferItems.find({
    offer_id: { $in: offerIds },
  })
    .select("offer_id item_id sort")
    .lean();

  const byOffer = new Map<string, { item_id: string; sort?: number }[]>();
  for (const l of links) {
    const arr = byOffer.get(l.offer_id) || [];
    arr.push({ item_id: l.item_id, sort: l.sort });
    byOffer.set(l.offer_id, arr);
  }

  const allItemIds = Array.from(new Set(links.map((l) => l.item_id)));
  const items = await Items.find({ id: { $in: allItemIds } })
    .select(
      "id name price dp discount category releaseDate image images title "
    )
    .lean();
  const itemMap = new Map(items.map((it) => [it.id, it]));

  return list.map((o) => {
    const rows = (byOffer.get(o.id) || []).sort(
      (a, b) => (a.sort ?? 0) - (b.sort ?? 0)
    );
    const resolved = rows.map((r) => itemMap.get(r.item_id)).filter(Boolean);
    return { ...o, items: resolved };
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await dbConnect();

  const { method } = req;

  switch (method) {
    case "GET": {
      try {
        const include = String(req.query.include || "");
        const list = await PreorderOffers.find({}).lean<IPreorderOffer[]>();
        if (include === "items") {
          const withItems = await embedItems(list);
          return res.status(200).json(withItems);
        }
        return res.status(200).json(list);
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
      }
    }

    case "POST": {
      try {
        const {
          id,
          title,
          description,
          start_date,
          end_date,
          active = true,
          banner,
          logo,
          item_ids, // optional string[]
        } = req.body || {};

        if (!id || !title || !start_date || !end_date) {
          return res
            .status(400)
            .json({ error: "id, title, start_date, end_date are required" });
        }

        const created = await PreorderOffers.create({
          id,
          title,
          description,
          start_date,
          end_date,
          active: !!active,
          banner,
          logo,
        });

        // If item_ids were provided, create link rows
        if (Array.isArray(item_ids) && item_ids.length) {
          const docs = Array.from(new Set(item_ids)).map((item_id, idx) => ({
            offer_id: id,
            item_id,
            sort: idx,
          }));
          try {
            await PreorderOfferItems.insertMany(docs, { ordered: false });
          } catch (e: any) {
            // ignore dup errors, unique index protects
            if (e?.code !== 11000) throw e;
          }
        }

        // Optional: return with items if requested
        if (String(req.query.include || "") === "items") {
          const withItems = await embedItems([created.toObject()]);
          return res.status(201).json(withItems[0]);
        }

        return res.status(201).json(created);
      } catch (err: any) {
        if (err?.code === 11000) {
          return res.status(400).json({ error: "Offer id already exists" });
        }
        console.error(err);
        return res.status(500).json({ error: "Server error" });
      }
    }

    default: {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).end("Method Not Allowed");
    }
  }
}
